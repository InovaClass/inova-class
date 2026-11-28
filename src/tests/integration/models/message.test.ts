import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import { classMessages, objectives, users } from '@/infra/database/schema'
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
import { missionModel } from '@/models/mission/model'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'
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

const newDiscussion = async ({ publish = true } = {}) => {
  const { teacherId, classId, studentId } = await newBoard()
  // The discussion works with the class board closed
  await classModel.setChatEnabled(teacherId, classId, false)
  const { id: missionId } = await missionModel.create(teacherId, classId, {
    name: 'A floresta',
    description: '',
    map: 'forest'
  })
  const objectiveIds: string[] = []
  for (const name of ['A trilha', 'A ponte']) {
    const { id } = await missionModel.createObjective(
      teacherId,
      classId,
      missionId,
      {
        name,
        story: 'A vila precisa de ajuda.',
        dueOn: '',
        xpReward: '10',
        coinReward: '',
        latePenaltyCoins: '',
        latePenaltyHp: '',
        discussionEnabled: true
      }
    )
    objectiveIds.push(id)
  }
  if (publish) await missionModel.publish(teacherId, classId, missionId)
  const [firstId, secondId] = objectiveIds as [string, string]
  return { teacherId, classId, studentId, missionId, firstId, secondId }
}

const threadBodies = (
  threads: { objectiveId: string; messages: { body: string }[] }[],
  objectiveId: string
) =>
  threads
    .find((thread) => thread.objectiveId === objectiveId)
    ?.messages.map(({ body }) => body)

describe('messageModel discussions', () => {
  test('keeps the messages of a discussion off the class board', async () => {
    const { teacherId, classId, studentId, missionId, firstId } =
      await newDiscussion()
    await classModel.setChatEnabled(teacherId, classId, true)

    await messageModel.postToThreadAsStudent(
      studentId,
      classId,
      firstId,
      message('Posso usar o livro?')
    )
    await messageModel.postAsStudent(studentId, classId, message('Bom dia'))

    const board = await messageModel.listForStudent(studentId, classId)
    expect(board?.messages.map(({ body }) => body)).toEqual(['Bom dia'])
    const teacherThreads = await messageModel.listThreadsForTeacher(
      teacherId,
      classId,
      missionId
    )
    expect(threadBodies(teacherThreads, firstId)).toEqual([
      'Posso usar o livro?'
    ])
  })

  test('hides the discussion of a locked objective from the student', async () => {
    const { classId, studentId, missionId, firstId, secondId } =
      await newDiscussion()

    const discussions = await messageModel.listThreadsForStudent(
      studentId,
      classId,
      missionId
    )
    expect(discussions?.threads.map(({ objectiveId }) => objectiveId)).toEqual([
      firstId
    ])
    await expect(
      messageModel.postToThreadAsStudent(
        studentId,
        classId,
        secondId,
        message()
      )
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  test('opens the discussion once the student reaches the objective', async () => {
    const { classId, studentId, missionId, firstId, secondId } =
      await newDiscussion()

    await objectiveSubmissionModel.submit(studentId, classId, firstId, {
      text: 'Fiz a pesquisa.',
      link: ''
    })
    await messageModel.postToThreadAsStudent(
      studentId,
      classId,
      secondId,
      message('Cheguei à ponte')
    )

    const discussions = await messageModel.listThreadsForStudent(
      studentId,
      classId,
      missionId
    )
    expect(threadBodies(discussions!.threads, secondId)).toEqual([
      'Cheguei à ponte'
    ])
  })

  test('keeps a closed discussion readable without letting anyone post', async () => {
    const { teacherId, classId, studentId, missionId, firstId } =
      await newDiscussion()
    await messageModel.postToThreadAsTeacher(
      teacherId,
      classId,
      firstId,
      message('Dúvidas aqui')
    )

    await database
      .update(objectives)
      .set({ discussionEnabled: false })
      .where(eq(objectives.id, firstId))

    await expect(
      messageModel.postToThreadAsStudent(studentId, classId, firstId, message())
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      messageModel.postToThreadAsTeacher(teacherId, classId, firstId, message())
    ).rejects.toBeInstanceOf(ValidationError)
    const discussions = await messageModel.listThreadsForStudent(
      studentId,
      classId,
      missionId
    )
    expect(discussions?.threads).toEqual([
      expect.objectContaining({
        objectiveId: firstId,
        discussionEnabled: false
      })
    ])
    expect(threadBodies(discussions!.threads, firstId)).toEqual([
      'Dúvidas aqui'
    ])
  })

  test('leaves out a closed discussion without messages', async () => {
    const { teacherId, classId, studentId, missionId, firstId } =
      await newDiscussion()

    await database
      .update(objectives)
      .set({ discussionEnabled: false })
      .where(eq(objectives.id, firstId))

    const discussions = await messageModel.listThreadsForStudent(
      studentId,
      classId,
      missionId
    )
    expect(discussions?.threads).toEqual([])
    const teacherThreads = await messageModel.listThreadsForTeacher(
      teacherId,
      classId,
      missionId
    )
    expect(teacherThreads.map(({ objectiveId }) => objectiveId)).not.toContain(
      firstId
    )
  })

  test('applies the mute of the board to the discussions', async () => {
    const { teacherId, classId, studentId, missionId, firstId } =
      await newDiscussion()

    await messageModel.setMuted(teacherId, classId, studentId, true)

    await expect(
      messageModel.postToThreadAsStudent(studentId, classId, firstId, message())
    ).rejects.toBeInstanceOf(ValidationError)
    const discussions = await messageModel.listThreadsForStudent(
      studentId,
      classId,
      missionId
    )
    expect(discussions?.muted).toBe(true)
  })

  test('counts the board and the discussions in the same rate limit', async () => {
    const { teacherId, classId, studentId, firstId } = await newDiscussion()
    await classModel.setChatEnabled(teacherId, classId, true)
    for (let index = 0; index < MESSAGE_RATE_LIMIT; index++) {
      await messageModel.postAsStudent(studentId, classId, message())
    }

    await expect(
      messageModel.postToThreadAsStudent(studentId, classId, firstId, message())
    ).rejects.toBeInstanceOf(TooManyRequestsError)
  })

  test('lets the student remove their own message from a closed discussion', async () => {
    const { classId, studentId, missionId, firstId } = await newDiscussion()
    await messageModel.postToThreadAsStudent(
      studentId,
      classId,
      firstId,
      message('Mensagem errada')
    )
    await database
      .update(objectives)
      .set({ discussionEnabled: false })
      .where(eq(objectives.id, firstId))
    const discussions = await messageModel.listThreadsForStudent(
      studentId,
      classId,
      missionId
    )
    const { id } = discussions!.threads[0]!.messages[0]!

    await messageModel.removeAsStudent(studentId, classId, id)

    const after = await messageModel.listThreadsForStudent(
      studentId,
      classId,
      missionId
    )
    expect(after?.threads).toEqual([])
  })

  test("hides a draft's discussions from the student and opens them to the teacher", async () => {
    const { teacherId, classId, studentId, missionId, firstId } =
      await newDiscussion({ publish: false })

    await messageModel.postToThreadAsTeacher(
      teacherId,
      classId,
      firstId,
      message('Preparando')
    )

    await expect(
      messageModel.postToThreadAsStudent(studentId, classId, firstId, message())
    ).rejects.toBeInstanceOf(NotFoundError)
    expect(
      await messageModel.listThreadsForStudent(studentId, classId, missionId)
    ).toBeUndefined()
  })
})
