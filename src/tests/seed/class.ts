import { and, eq } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { users } from '@/infra/database/schema'

import { appendCredentials } from './credentials'
import { runOnLocalDatabase } from './local-database'
import {
  createClass,
  createUsers,
  enroll,
  parseCount,
  SEED_PASSWORD,
  type SeedUser,
  USER_HEADER,
  userRows
} from './seeder'

const [teacherEmail, studentCount] = process.argv.slice(2)

await runOnLocalDatabase(async () => {
  if (!teacherEmail)
    throw new Error('Usage: pnpm db:seed:class <teacher-email> [students]')
  const email = teacherEmail.toLowerCase()
  const [teacher] = await database
    .select({
      id: users.id,
      role: users.role,
      name: users.name,
      email: users.email,
      username: users.username
    })
    .from(users)
    .where(and(eq(users.email, email), eq(users.role, 'teacher')))
  if (!teacher)
    throw new Error(`No teacher account with the email ${teacherEmail}`)

  const schoolClass = await createClass(teacher satisfies SeedUser)
  const students = await createUsers('student', parseCount(studentCount, 5))
  await enroll(schoolClass, students)
  console.log(
    `Created ${schoolClass.name} (${schoolClass.id}), students: ${students.length}`
  )
  await appendCredentials('db:seed:class', {
    password: SEED_PASSWORD,
    sections: [
      {
        title: 'Turma',
        header: ['Turma', 'Professor', 'Código de entrada', 'ID'],
        rows: [
          [
            schoolClass.name,
            teacher.email,
            schoolClass.joinCode,
            schoolClass.id
          ]
        ]
      },
      { title: 'Alunos', header: USER_HEADER, rows: userRows(students) }
    ]
  })
})
