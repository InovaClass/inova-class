import { appendCredentials } from './credentials'
import { runOnLocalDatabase } from './local-database'
import {
  createUsers,
  parseCount,
  SEED_PASSWORD,
  USER_HEADER,
  userRows
} from './seeder'

const [teacherCount, studentCount] = process.argv.slice(2)

await runOnLocalDatabase(async () => {
  const teachers = await createUsers('teacher', parseCount(teacherCount, 1))
  const students = await createUsers('student', parseCount(studentCount, 1))
  console.log(
    `Created teachers: ${teachers.length}, students: ${students.length}`
  )
  await appendCredentials('db:seed:users', {
    password: SEED_PASSWORD,
    sections: [
      {
        title: 'Contas',
        header: USER_HEADER,
        rows: userRows([...teachers, ...students])
      }
    ]
  })
})
