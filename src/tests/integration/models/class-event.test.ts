import { setTimeout } from 'node:timers/promises'

import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import { enrollments, users } from '@/infra/database/schema'
import { closeRealtime } from '@/infra/realtime'
import { classModel } from '@/models/class/model'
import { classEventModel } from '@/models/class-event/model'
import { ledgerModel } from '@/models/ledger/model'
import { orchestrator } from '@/tests/orchestrator'

// Time enough for a published message to come back through the local Redis
const DELIVERY_MS = 300

afterAll(() => closeRealtime())

const newUser = async (role: UserRole) => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role })
    .returning()
  return { id: user!.id, role }
}

const newScenario = async () => {
  const teacher = await newUser('teacher')
  const { id: classId } = await classModel.create(
    teacher.id,
    orchestrator.newClass()
  )
  const student = await newUser('student')
  const [enrollment] = await database
    .insert(enrollments)
    .values({ studentId: student.id, classId })
    .returning()
  return { teacher, student, classId, enrollmentId: enrollment!.id }
}

const listenTo = async (
  user: { id: string; role: UserRole },
  classId: string
) => {
  const messages: unknown[] = []
  const unsubscribe = await classEventModel.listen(user, classId, (message) => {
    messages.push(JSON.parse(message))
  })
  return { messages, unsubscribe }
}

describe('classEventModel.listen', () => {
  test('delivers the events of the class to its teacher and its students', async () => {
    const { teacher, student, classId } = await newScenario()
    const teacherStream = await listenTo(teacher, classId)
    const studentStream = await listenTo(student, classId)

    await classEventModel.publish(classId, 'reward-order')
    await setTimeout(DELIVERY_MS)

    expect(teacherStream.messages).toEqual([{ type: 'reward-order' }])
    expect(studentStream.messages).toEqual([{ type: 'reward-order' }])
    await teacherStream.unsubscribe?.()
    await studentStream.unsubscribe?.()
  })

  test("doesn't deliver the events of another class", async () => {
    const { teacher, classId } = await newScenario()
    const other = await newScenario()
    const stream = await listenTo(teacher, classId)

    await classEventModel.publish(other.classId, 'ledger')
    await setTimeout(DELIVERY_MS)

    expect(stream.messages).toEqual([])
    await stream.unsubscribe?.()
  })

  test('stops delivering once unsubscribed', async () => {
    const { teacher, classId } = await newScenario()
    const stream = await listenTo(teacher, classId)

    await stream.unsubscribe?.()
    await classEventModel.publish(classId, 'ledger')
    await setTimeout(DELIVERY_MS)

    expect(stream.messages).toEqual([])
  })

  test('refuses a teacher of another class, a student not enrolled and a malformed id', async () => {
    const { classId } = await newScenario()
    const other = await newScenario()

    expect(await listenTo(other.teacher, classId)).toMatchObject({
      unsubscribe: undefined
    })
    expect(await listenTo(other.student, classId)).toMatchObject({
      unsubscribe: undefined
    })
    expect(await listenTo(other.teacher, 'not-a-uuid')).toMatchObject({
      unsubscribe: undefined
    })
  })

  test('refuses a student who left the class and the teacher once it is archived', async () => {
    const { teacher, student, classId, enrollmentId } = await newScenario()
    await database
      .update(enrollments)
      .set({ endedAt: new Date() })
      .where(eq(enrollments.id, enrollmentId))

    expect(await listenTo(student, classId)).toMatchObject({
      unsubscribe: undefined
    })

    await classModel.archive(teacher.id, classId)
    expect(await listenTo(teacher, classId)).toMatchObject({
      unsubscribe: undefined
    })
  })
})

describe('ledger changes', () => {
  test('announce the change to the class once it is committed', async () => {
    const { teacher, classId, enrollmentId } = await newScenario()
    const stream = await listenTo(teacher, classId)

    await ledgerModel.record({
      enrollmentId,
      type: 'behavior',
      xpDelta: 10,
      hpDelta: 0,
      coinDelta: 0,
      createdById: teacher.id
    })
    await setTimeout(DELIVERY_MS)

    expect(stream.messages).toEqual([{ type: 'ledger' }])
    await stream.unsubscribe?.()
  })
})
