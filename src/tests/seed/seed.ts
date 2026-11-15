import { HP_MAX } from '@/constants/game'
import { behaviorModel } from '@/models/behavior/model'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'
import { powerRequestModel } from '@/models/power-request/model'

import { appendCredentials } from './credentials'
import { runOnLocalDatabase } from './local-database'
import {
  awardRandomBehaviors,
  createClass,
  createUsers,
  enroll,
  invitePendingStudent,
  SEED_PASSWORD,
  type SeedClass,
  type SeedUser,
  USER_HEADER,
  userRows
} from './seeder'

const awardRepeatedly = async (
  teacher: SeedUser,
  schoolClass: SeedClass,
  behaviorName: string,
  student: SeedUser,
  times: number
) => {
  const behaviors = await behaviorModel.list(teacher.id, schoolClass.id)
  const behavior = behaviors.find(({ name }) => name === behaviorName)
  if (!behavior) throw new Error(`No behavior named ${behaviorName}`)
  for (let award = 0; award < times; award++) {
    await behaviorModel.award(teacher.id, schoolClass.id, behavior.id, [
      student.id
    ])
  }
}

const requestFirstPower = async (schoolClass: SeedClass, student: SeedUser) => {
  const listed = await powerRequestModel.listForStudent(
    student.id,
    schoolClass.id
  )
  const power = listed?.powers.find(
    ({ unlocked, affordable }) => unlocked && affordable
  )
  if (!power) throw new Error(`No power ${student.username} can request`)
  await powerRequestModel.request(student.id, schoolClass.id, power.id)
  return power
}

await runOnLocalDatabase(async () => {
  const [firstTeacher, secondTeacher] = (await createUsers('teacher', 2)) as [
    SeedUser,
    SeedUser
  ]
  const students = await createUsers('student', 12)
  const [leveledUp, fallen, removed, withoutCharacter] = [0, 1, 6, 7].map(
    (index) => students[index]
  )

  const fullClass = await createClass(firstTeacher)
  await enroll(fullClass, students.slice(0, 7))
  await enroll(fullClass, [withoutCharacter!], { withCharacter: false })
  await awardRandomBehaviors(
    firstTeacher.id,
    fullClass.id,
    students.slice(0, 8).map(({ id }) => id),
    30
  )
  await awardRepeatedly(
    firstTeacher,
    fullClass,
    'Superou um desafio',
    leveledUp!,
    12
  )
  await awardRepeatedly(
    firstTeacher,
    fullClass,
    'Desrespeitou um colega',
    fallen!,
    Math.ceil(HP_MAX / 15)
  )
  const requestedPower = await requestFirstPower(fullClass, leveledUp!)
  await enrollmentModel.remove(firstTeacher.id, fullClass.id, removed!.id)
  const pending = await invitePendingStudent(firstTeacher, fullClass)

  const second = await createClass(firstTeacher)
  await enroll(second, students.slice(8, 10))
  await awardRandomBehaviors(
    firstTeacher.id,
    second.id,
    students.slice(8, 10).map(({ id }) => id),
    5
  )

  const archived = await createClass(firstTeacher)
  await enroll(archived, students.slice(10, 11))
  await classModel.archive(firstTeacher.id, archived.id)

  const other = await createClass(secondTeacher)
  await enroll(other, [...students.slice(10, 12), leveledUp!])
  await awardRandomBehaviors(
    secondTeacher.id,
    other.id,
    [...students.slice(10, 12), leveledUp!].map(({ id }) => id),
    10
  )

  console.log('Seeded 2 teachers, 13 students and 4 classes')
  await appendCredentials('db:seed', {
    password: SEED_PASSWORD,
    sections: [
      {
        title: 'Contas',
        header: USER_HEADER,
        rows: userRows([firstTeacher, secondTeacher, ...students])
      },
      {
        title: 'Turmas',
        header: ['Turma', 'Professor', 'Código de entrada', 'Situação', 'ID'],
        rows: [
          [
            fullClass.name,
            firstTeacher.email,
            fullClass.joinCode,
            'Histórico completo',
            fullClass.id
          ],
          [
            second.name,
            firstTeacher.email,
            second.joinCode,
            'Poucos alunos',
            second.id
          ],
          [
            archived.name,
            firstTeacher.email,
            archived.joinCode,
            'Arquivada',
            archived.id
          ],
          [
            other.name,
            secondTeacher.email,
            other.joinCode,
            'Outro professor',
            other.id
          ]
        ]
      },
      {
        title: 'Casos',
        header: ['Aluno', 'Situação'],
        rows: [
          [
            leveledUp!.username!,
            `Subiu de nível em ${fullClass.name} e também está em ${other.name}`
          ],
          [
            leveledUp!.username!,
            `Pediu o poder ${requestedPower.name} em ${fullClass.name}`
          ],
          [fallen!.username!, `Sem HP em ${fullClass.name}`],
          [withoutCharacter!.username!, `Sem personagem em ${fullClass.name}`],
          [removed!.username!, `Removido de ${fullClass.name}`]
        ]
      },
      {
        title: 'Convite pendente',
        header: ['Nome', 'E-mail', 'Usuário', 'Link'],
        rows: [[pending.name, pending.email, pending.username, pending.link]]
      }
    ]
  })
})
