import { describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import { classMessages, users } from '@/infra/database/schema'
import {
  NotFoundError,
  TooManyRequestsError,
  ValidationError
} from '@/infra/errors'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'
import {
  MESSAGE_RATE_LIMIT,
  MESSAGE_RATE_WINDOW_IN_MS
} from '@/models/message/constants'
import { messageModel } from '@/models/message/model'
import { orchestrator } from '@/tests/orchestrator'

const newUserId = async (role: UserRole) => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role })
    .returning()
  return user!.id
}

const newBoard = async () => {
  const teacherId = await newUserId('teacher')
  const schoolClass = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  await classModel.setChatEnabled(teacherId, schoolClass.id, true)
  const studentId = await newUserId('student')
  await enrollmentModel.join(studentId, { code: schoolClass.joinCode })
  return { teacherId, classId: schoolClass.id, studentId }
}

const message = (body = 'Olá, turma!') => ({ body })

describe('messageModel.setMuted', () => {
  test('keeps a muted student reading the board but not posting', async () => {
    const { teacherId, classId, studentId } = await newBoard()
    await messageModel.postAsTeacher(teacherId, classId, message('Bem-vindos'))

    await messageModel.setMuted(teacherId, classId, studentId, true)

    await expect(
      messageModel.postAsStudent(studentId, classId, message())
    ).rejects.toBeInstanceOf(ValidationError)
    const board = await messageModel.listForStudent(studentId, classId)
    expect(board?.muted).toBe(true)
    expect(board?.messages.map(({ body }) => body)).toEqual(['Bem-vindos'])
  })

  test('lets the student post again once unmuted', async () => {
    const { teacherId, classId, studentId } = await newBoard()
    await messageModel.setMuted(teacherId, classId, studentId, true)

    await messageModel.setMuted(teacherId, classId, studentId, false)
    await messageModel.postAsStudent(studentId, classId, message())

    const board = await messageModel.listForStudent(studentId, classId)
    expect(board?.muted).toBe(false)
    expect(board?.messages).toHaveLength(1)
  })

  test('mutes only in the class of the teacher', async () => {
    const { classId, studentId } = await newBoard()
    const otherTeacherId = await newUserId('teacher')

    await expect(
      messageModel.setMuted(otherTeacherId, classId, studentId, true)
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(
      messageModel.postAsStudent(studentId, classId, message())
    ).resolves.toBeUndefined()
  })

  test('rejects a student who left the class', async () => {
    const { teacherId, classId, studentId } = await newBoard()
    await enrollmentModel.remove(teacherId, classId, studentId)

    await expect(
      messageModel.setMuted(teacherId, classId, studentId, true)
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('messageModel.postAsStudent rate limit', () => {
  test('rejects the post past the limit', async () => {
    const { classId, studentId } = await newBoard()
    for (let index = 0; index < MESSAGE_RATE_LIMIT; index++) {
      await messageModel.postAsStudent(studentId, classId, message())
    }

    await expect(
      messageModel.postAsStudent(studentId, classId, message())
    ).rejects.toBeInstanceOf(TooManyRequestsError)
  })

  test('lets parallel posts through only up to the limit', async () => {
    const { classId, studentId } = await newBoard()

    const results = await Promise.allSettled(
      Array.from({ length: MESSAGE_RATE_LIMIT + 3 }, () =>
        messageModel.postAsStudent(studentId, classId, message())
      )
    )

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      MESSAGE_RATE_LIMIT
    )
  })

  test('counts only the messages within the window', async () => {
    const { classId, studentId } = await newBoard()
    const before = new Date(Date.now() - MESSAGE_RATE_WINDOW_IN_MS - 1000)
    await database.insert(classMessages).values(
      Array.from({ length: MESSAGE_RATE_LIMIT }, () => ({
        classId,
        authorId: studentId,
        body: 'Antiga',
        createdAt: before
      }))
    )

    await expect(
      messageModel.postAsStudent(studentId, classId, message())
    ).resolves.toBeUndefined()
  })

  test("doesn't limit the teacher", async () => {
    const { teacherId, classId } = await newBoard()

    for (let index = 0; index <= MESSAGE_RATE_LIMIT; index++) {
      await messageModel.postAsTeacher(teacherId, classId, message())
    }

    const board = await messageModel.listForTeacher(teacherId, classId)
    expect(board.messages).toHaveLength(MESSAGE_RATE_LIMIT + 1)
  })
})
