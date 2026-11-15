import { fakerPT_BR as faker } from '@faker-js/faker'

import type { UserRole } from '@/constants/user'
import { auth } from '@/infra/auth'
import { database } from '@/infra/database/client'
import { accounts, users } from '@/infra/database/schema'
import { AVATAR_MANIFEST } from '@/models/avatar/manifest'
import { behaviorModel } from '@/models/behavior/model'
import { NO_HAIR } from '@/models/character/constants'
import { CHARACTER_CLASSES, outfitColorsOf } from '@/models/character/look'
import { characterModel } from '@/models/character/model'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'
import { STUDENT_INVITE_EXPIRATION_DAYS } from '@/models/student/constants'
import { usernameBase } from '@/models/student/username'
import { studentRepo } from '@/repositories/student-repo'

export const SEED_PASSWORD = 'senha12345'

const APP_URL = 'http://localhost:3000'

const SUBJECTS = [
  'Matemática',
  'Português',
  'História',
  'Geografia',
  'Ciências',
  'Inglês',
  'Artes',
  'Educação Física'
]

export type SeedUser = {
  id: string
  role: UserRole
  name: string
  email: string
  username: string | null
}

export type SeedClass = { id: string; name: string; joinCode: string }

// Readable for typing on the sign-in page, with a random suffix so runs never collide
const identityOf = (role: UserRole, name: string) => {
  const base = usernameBase(name).slice(0, 23)
  const suffix = crypto.randomUUID().slice(0, 6)
  const prefix = role === 'teacher' ? 'professor' : 'aluno'
  return {
    email: `${prefix}.${base}.${suffix}@example.com`,
    username: `${base}.${suffix}`
  }
}

// Inserted directly instead of through sign-up, whose verification email goes through after(), which
// only works inside a Next.js request
export const createUsers = async (role: UserRole, count: number) => {
  if (count === 0) return []
  const { password } = await auth.$context
  const hash = await password.hash(SEED_PASSWORD)
  const now = new Date()
  const created: SeedUser[] = Array.from({ length: count }, () => {
    const name = faker.person.fullName()
    const { email, username } = identityOf(role, name)
    return {
      id: crypto.randomUUID(),
      role,
      name,
      email,
      username: role === 'student' ? username : null
    }
  })
  await database.transaction(async (transaction) => {
    await transaction.insert(users).values(
      created.map((user) => ({
        ...user,
        displayUsername: user.username,
        emailVerified: true,
        termsAcceptedAt: now
      }))
    )
    await transaction.insert(accounts).values(
      created.map(({ id }) => ({
        userId: id,
        accountId: id,
        providerId: 'credential',
        password: hash
      }))
    )
  })
  return created
}

export const createClass = async (teacher: SeedUser): Promise<SeedClass> => {
  const subject = faker.helpers.arrayElement(SUBJECTS)
  const grade = faker.number.int({ min: 6, max: 9 })
  const section = faker.helpers.arrayElement(['A', 'B', 'C'])
  return classModel.create(teacher.id, {
    name: `${subject} · ${grade}º ano ${section}`,
    description: faker.lorem.sentence()
  })
}

export const chooseCharacter = (studentId: string, classId: string) => {
  const characterClass = faker.helpers.arrayElement(CHARACTER_CLASSES)
  return characterModel.choose(studentId, classId, {
    characterClass,
    bodyType: faker.helpers.arrayElement(AVATAR_MANIFEST.bodyTypes),
    skin: faker.helpers.arrayElement(AVATAR_MANIFEST.skins),
    hairStyle:
      faker.helpers.maybe(
        () => faker.helpers.arrayElement(AVATAR_MANIFEST.hairStyles),
        { probability: 0.9 }
      ) ?? NO_HAIR,
    hairColor: faker.helpers.arrayElement(AVATAR_MANIFEST.hairColors),
    outfitColor: faker.helpers.arrayElement(outfitColorsOf(characterClass))
  })
}

export const enroll = async (
  schoolClass: SeedClass,
  students: SeedUser[],
  { withCharacter = true } = {}
) => {
  for (const student of students) {
    await enrollmentModel.join(student.id, { code: schoolClass.joinCode })
    if (withCharacter) await chooseCharacter(student.id, schoolClass.id)
  }
}

// Skips the email of studentModel.invite, whose after() only works inside a Next.js request
export const invitePendingStudent = async (
  teacher: SeedUser,
  schoolClass: SeedClass
) => {
  const name = faker.person.fullName()
  const student = {
    id: crypto.randomUUID(),
    name,
    ...identityOf('student', name)
  }
  const token = crypto.randomUUID()
  await studentRepo.saveInvites({
    newStudents: [{ ...student, createdById: teacher.id }],
    enrollments: [{ studentId: student.id, classId: schoolClass.id }],
    invites: [
      {
        studentId: student.id,
        token,
        expiresAt: new Date(
          Date.now() + STUDENT_INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
        )
      }
    ]
  })
  return { ...student, link: `${APP_URL}/convite?token=${token}` }
}

export const awardRandomBehaviors = async (
  teacherId: string,
  classId: string,
  studentIds: string[],
  rounds: number
) => {
  if (studentIds.length === 0) return 0
  const behaviors = await behaviorModel.list(teacherId, classId)
  const positive = behaviors.filter(({ kind }) => kind === 'positive')
  const negative = behaviors.filter(({ kind }) => kind === 'negative')
  for (let round = 0; round < rounds; round++) {
    const pool =
      negative.length > 0 && (positive.length === 0 || Math.random() < 0.3)
        ? negative
        : positive
    if (pool.length === 0) return round
    await behaviorModel.award(
      teacherId,
      classId,
      faker.helpers.arrayElement(pool).id,
      faker.helpers.arrayElements(studentIds, {
        min: 1,
        max: studentIds.length
      })
    )
  }
  return rounds
}

export const userRows = (seeded: SeedUser[]) =>
  seeded.map(({ role, name, email, username }) => [
    role === 'teacher' ? 'Professor' : 'Aluno',
    name,
    email,
    username ?? '—'
  ])

export const USER_HEADER = ['Papel', 'Nome', 'E-mail', 'Usuário']

export const parseCount = (value: string | undefined, fallback: number) => {
  if (value === undefined) return fallback
  const count = Number(value)
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Expected a whole number, got "${value}"`)
  }
  return count
}
