import { eq } from 'drizzle-orm'
import { describe, expect, test, vi } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import {
  accounts,
  enrollments,
  users,
  verifications
} from '@/infra/database/schema'
import { NotFoundError, ValidationError } from '@/infra/errors'
import { authenticationModel } from '@/models/authentication/model'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'
import { studentModel } from '@/models/student/model'
import { usernameBase } from '@/models/student/username'
import { studentRepo } from '@/repositories/student-repo'
import { orchestrator } from '@/tests/orchestrator'

const headers = new Headers({ host: 'localhost:3000' })

const newTeacher = async () => {
  const { name, email } = orchestrator.newUser()
  const [teacher] = await database
    .insert(users)
    .values({ name, email, role: 'teacher' as UserRole })
    .returning()
  return teacher!
}

const newClass = async () => {
  const teacher = await newTeacher()
  const schoolClass = await classModel.create(
    teacher.id,
    orchestrator.newClass()
  )
  return { teacherId: teacher.id, schoolClass }
}

const invite = async (
  { teacherId, classId }: { teacherId: string; classId: string },
  ...students: { name: string; email: string }[]
) =>
  studentModel.invite(
    teacherId,
    classId,
    { students: students.map((s) => `${s.name}, ${s.email}`).join('\n') },
    { headers }
  )

const inviteNewStudent = async () => {
  const { teacherId, schoolClass } = await newClass()
  const student = orchestrator.newUser()
  await invite({ teacherId, classId: schoolClass.id }, student)
  return { teacherId, schoolClass, student }
}

const findUser = async (email: string) => {
  const [user] = await database
    .select()
    .from(users)
    .where(eq(users.email, email))
  return user
}

const classIdsOf = async (email: string) => {
  const user = await findUser(email)
  const rows = await database
    .select({ classId: enrollments.classId })
    .from(enrollments)
    .where(eq(enrollments.studentId, user!.id))
  return rows.map(({ classId }) => classId)
}

const tokenSentTo = async (email: string) => {
  const link = await orchestrator.waitForLinkSentTo(email, {
    subject: 'Crie sua senha'
  })
  return link.searchParams.get('token')!
}

const acceptInvite = async (token: string, password: string) =>
  studentModel.acceptInvite(
    { password, passwordConfirmation: password, acceptedTerms: true },
    { headers, token }
  )

const signUpActiveStudent = async () => {
  const student = orchestrator.newStudent()
  await authenticationModel.signUpStudent(
    { ...student, passwordConfirmation: student.password, acceptedTerms: true },
    { headers, callbackURL: '/entrar' }
  )
  return student
}

describe('studentModel', () => {
  describe('invite', () => {
    test('creates a pending student, enrolled, with a unique username', async () => {
      const { teacherId, schoolClass } = await newClass()
      const first = { ...orchestrator.newUser(), name: 'Élia Zanetti' }
      const second = { ...orchestrator.newUser(), name: 'Élia Zanetti' }

      const result = await invite(
        { teacherId, classId: schoolClass.id },
        first,
        second
      )

      expect(result).toEqual({ count: 2 })
      const stored = await findUser(first.email)
      expect(stored).toMatchObject({
        role: 'student',
        emailVerified: false,
        termsAcceptedAt: null,
        createdById: teacherId
      })
      expect(stored!.username).toMatch(/^elia\.zanetti\d*$/)
      expect((await findUser(second.email))!.username).not.toBe(
        stored!.username
      )
      expect(await classIdsOf(first.email)).toEqual([schoolClass.id])
      const link = await orchestrator.waitForLinkSentTo(first.email, {
        subject: 'Crie sua senha'
      })
      expect(link.pathname).toBe('/convite')
    })

    test('a new invite enrolls a pending student and replaces the link', async () => {
      const { student, schoolClass } = await inviteNewStudent()
      const oldToken = await tokenSentTo(student.email)
      const other = await newClass()

      await invite(
        { teacherId: other.teacherId, classId: other.schoolClass.id },
        student
      )

      expect(await classIdsOf(student.email)).toEqual(
        expect.arrayContaining([schoolClass.id, other.schoolClass.id])
      )
      expect(await studentModel.findInvite(oldToken)).toBeUndefined()
      await expect
        .poll(async () => {
          const messages = await orchestrator.listEmailsTo(student.email)
          return messages.length
        })
        .toBe(2)
    })

    test('enrolls an active student once and only notifies them', async () => {
      const { teacherId, schoolClass } = await newClass()
      const student = await signUpActiveStudent()
      const classId = schoolClass.id
      const countEmails = async (subject: string) => {
        const messages = await orchestrator.listEmailsTo(student.email)
        return messages.filter(({ Subject }) => Subject.includes(subject))
          .length
      }

      await invite({ teacherId, classId }, student)
      await invite({ teacherId, classId }, student)

      expect(await classIdsOf(student.email)).toEqual([classId])
      await expect.poll(() => countEmails('entrou em uma turma')).toBe(1)
      expect(await countEmails('Crie sua senha')).toBe(0)
      expect((await findUser(student.email))!.createdById).toBeNull()
    })

    test('a new invite brings a removed student back and notifies them again', async () => {
      const { teacherId, schoolClass } = await newClass()
      const student = await signUpActiveStudent()
      const classId = schoolClass.id
      const countNotices = async () => {
        const messages = await orchestrator.listEmailsTo(student.email)
        return messages.filter(({ Subject }) =>
          Subject.includes('entrou em uma turma')
        ).length
      }
      await invite({ teacherId, classId }, student)
      await expect.poll(countNotices).toBe(1)
      const { id: studentId } = (await findUser(student.email))!
      await enrollmentModel.remove(teacherId, classId, studentId)

      await invite({ teacherId, classId }, student)

      const roster = await enrollmentModel.listRoster(teacherId, classId)
      expect(roster.map(({ id }) => id)).toEqual([studentId])
      await expect.poll(countNotices).toBe(2)
    })

    test('gives the same answer for a teacher, without enrolling or emailing', async () => {
      const { teacherId, schoolClass } = await newClass()
      const other = await newTeacher()

      const result = await invite(
        { teacherId, classId: schoolClass.id },
        { name: other.name, email: other.email }
      )

      expect(result).toEqual({ count: 1 })
      expect(await classIdsOf(other.email)).toEqual([])
      expect(await orchestrator.listEmailsTo(other.email)).toEqual([])
    })

    test('rejects a class of another teacher, an archived one and a malformed id', async () => {
      const { teacherId, schoolClass } = await newClass()
      const other = await newTeacher()
      const archived = await newClass()
      await classModel.archive(archived.teacherId, archived.schoolClass.id)
      const student = orchestrator.newUser()

      for (const target of [
        { teacherId: other.id, classId: schoolClass.id },
        { teacherId: archived.teacherId, classId: archived.schoolClass.id },
        { teacherId, classId: 'not-a-uuid' }
      ]) {
        await expect(invite(target, student)).rejects.toBeInstanceOf(
          NotFoundError
        )
      }
      expect(await findUser(student.email)).toBeUndefined()
    })

    test('saves nothing when a write of the list fails', async () => {
      const { teacherId, schoolClass } = await newClass()
      const student = orchestrator.newUser()

      await expect(
        studentRepo.saveInvites({
          newStudents: [
            {
              id: crypto.randomUUID(),
              name: student.name,
              email: student.email,
              username: orchestrator.newUsername(),
              createdById: teacherId
            }
          ],
          enrollments: [
            { studentId: crypto.randomUUID(), classId: schoolClass.id }
          ],
          invites: []
        })
      ).rejects.toThrow()

      expect(await findUser(student.email)).toBeUndefined()
    })

    test('tries again when another request takes the username first', async () => {
      const { teacherId, schoolClass } = await newClass()
      const name = `Zeca ${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`
      const taken = usernameBase(name)
      await database.insert(users).values({
        name,
        email: orchestrator.newEmail(),
        role: 'student',
        username: taken
      })
      const student = { name, email: orchestrator.newEmail() }
      vi.spyOn(studentRepo, 'findUsernamesStartingWith').mockResolvedValueOnce(
        []
      )

      await invite({ teacherId, classId: schoolClass.id }, student)

      expect((await findUser(student.email))!.username).toBe(`${taken}2`)
    })
  })

  describe('acceptInvite', () => {
    test('activates the student, who then signs in by email or username', async () => {
      const { student, schoolClass } = await inviteNewStudent()
      const token = await tokenSentTo(student.email)
      const password = orchestrator.newPassword()

      await acceptInvite(token, password)

      const stored = await findUser(student.email)
      expect(stored!.emailVerified).toBe(true)
      expect(stored!.termsAcceptedAt).toBeInstanceOf(Date)
      for (const identifier of [student.email, stored!.username!]) {
        await expect(
          authenticationModel.signIn({ identifier, password }, { headers })
        ).resolves.toEqual({ mustChangePassword: false })
      }
      await expect(
        enrollmentModel.join(stored!.id, { code: schoolClass.joinCode })
      ).resolves.toMatchObject({ alreadyEnrolled: true })
    })

    test('requires the terms, and a refused attempt keeps the link valid', async () => {
      const { student } = await inviteNewStudent()
      const token = await tokenSentTo(student.email)
      const password = orchestrator.newPassword()

      await expect(
        studentModel.acceptInvite(
          { password, passwordConfirmation: password, acceptedTerms: false },
          { headers, token }
        )
      ).rejects.toMatchObject({
        issues: [expect.objectContaining({ path: ['acceptedTerms'] })]
      })

      expect(await studentModel.findInvite(token)).toBeDefined()
    })

    test('a link works only once', async () => {
      const { student } = await inviteNewStudent()
      const token = await tokenSentTo(student.email)
      await acceptInvite(token, orchestrator.newPassword())

      expect(await studentModel.findInvite(token)).toBeUndefined()
      await expect(
        acceptInvite(token, orchestrator.newPassword())
      ).rejects.toBeInstanceOf(ValidationError)
      const stored = await findUser(student.email)
      expect(
        await database
          .select()
          .from(accounts)
          .where(eq(accounts.userId, stored!.id))
      ).toHaveLength(1)
    })

    test('rejects an expired link and an unknown one', async () => {
      const { student } = await inviteNewStudent()
      const token = await tokenSentTo(student.email)
      await database
        .update(verifications)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(verifications.identifier, `student-invite:${token}`))

      for (const value of [token, crypto.randomUUID()]) {
        expect(await studentModel.findInvite(value)).toBeUndefined()
        await expect(
          acceptInvite(value, orchestrator.newPassword())
        ).rejects.toBeInstanceOf(ValidationError)
      }
    })
  })

  describe('requestPasswordReset of a pending student', () => {
    test('sends a new invite instead of a reset link', async () => {
      const { student } = await inviteNewStudent()
      const oldToken = await tokenSentTo(student.email)

      await authenticationModel.requestPasswordReset(
        { email: student.email.toUpperCase() },
        { headers, redirectTo: '/redefinir-senha' }
      )

      await expect
        .poll(async () => {
          const messages = await orchestrator.listEmailsTo(student.email)
          return messages.length
        })
        .toBe(2)
      expect(await studentModel.findInvite(oldToken)).toBeUndefined()
      const messages = await orchestrator.listEmailsTo(student.email)
      expect(
        messages.filter(({ Subject }) => Subject.includes('Redefina'))
      ).toEqual([])
    })
  })
})
