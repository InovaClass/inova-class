import { and, eq, inArray } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { database } from '@/infra/database/client'
import { enrollments, ledgerEntries, users } from '@/infra/database/schema'
import { NotFoundError, ValidationError } from '@/infra/errors'
import { DEFAULT_BEHAVIORS } from '@/models/behavior/constants'
import { behaviorModel } from '@/models/behavior/model'
import { classModel } from '@/models/class/model'
import { orchestrator } from '@/tests/orchestrator'

const newTeacherId = async () => {
  const { name, email } = orchestrator.newUser()
  const [teacher] = await database
    .insert(users)
    .values({ name, email, role: 'teacher' })
    .returning()
  return teacher!.id
}

const newClassOf = async (teacherId: string) =>
  classModel.create(teacherId, orchestrator.newClass())

const newStudentIn = async (classId: string) => {
  const { name, email } = orchestrator.newUser()
  const [student] = await database
    .insert(users)
    .values({ name, email, role: 'student' })
    .returning()
  await database.insert(enrollments).values({ studentId: student!.id, classId })
  return student!.id
}

const balancesOf = async (classId: string, studentIds: string[]) =>
  database
    .select({
      xp: enrollments.xp,
      hp: enrollments.hp,
      coins: enrollments.coins
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.classId, classId),
        inArray(enrollments.studentId, studentIds)
      )
    )

const newAwardScenario = async (xp = 100) => {
  const teacherId = await newTeacherId()
  const { id: classId } = await newClassOf(teacherId)
  const { id: behaviorId } = await behaviorModel.create(teacherId, classId, {
    name: 'Projeto entregue',
    xp: String(xp),
    hp: '',
    coins: '5'
  })
  const studentIds = [await newStudentIn(classId), await newStudentIn(classId)]
  return { teacherId, classId, behaviorId, studentIds }
}

const helpedClassmate = { name: 'Ajudou um colega', xp: 10, hp: 0, coins: 5 }

describe('behaviorModel', () => {
  test('a new class starts with the default behaviors', async () => {
    const teacherId = await newTeacherId()
    const { id: classId } = await newClassOf(teacherId)

    const behaviors = await behaviorModel.list(teacherId, classId)

    expect(behaviors.map(({ name }) => name)).toEqual(
      expect.arrayContaining(DEFAULT_BEHAVIORS.map(({ name }) => name))
    )
    expect(behaviors).toHaveLength(DEFAULT_BEHAVIORS.length)
    expect(behaviors.find(({ name }) => name === 'Chegou atrasado')?.kind).toBe(
      'negative'
    )
  })

  test('creates, edits and removes a behavior of the class', async () => {
    const teacherId = await newTeacherId()
    const { id: classId } = await newClassOf(teacherId)

    const { id } = await behaviorModel.create(teacherId, classId, {
      name: ' Leu em voz alta ',
      xp: '5',
      hp: '',
      coins: ''
    })
    expect(await behaviorModel.findOwned(teacherId, classId, id)).toEqual({
      id,
      name: 'Leu em voz alta',
      xp: 5,
      hp: 0,
      coins: 0
    })

    await behaviorModel.update(teacherId, classId, id, helpedClassmate)
    expect(await behaviorModel.findOwned(teacherId, classId, id)).toEqual({
      id,
      ...helpedClassmate
    })

    await behaviorModel.remove(teacherId, classId, id)
    expect(
      await behaviorModel.findOwned(teacherId, classId, id)
    ).toBeUndefined()
    const remaining = await behaviorModel.list(teacherId, classId)
    expect(remaining.map((behavior) => behavior.id)).not.toContain(id)
  })

  test('rejects invalid values before touching the class', async () => {
    const teacherId = await newTeacherId()

    await expect(
      behaviorModel.create(teacherId, crypto.randomUUID(), {
        name: 'Ajudou um colega',
        xp: -5,
        hp: 0,
        coins: 0
      })
    ).rejects.toBeInstanceOf(z.ZodError)
  })

  test('hides the behaviors of another teacher and of an archived class', async () => {
    const teacherId = await newTeacherId()
    const otherTeacherId = await newTeacherId()
    const { id: classId } = await newClassOf(teacherId)
    const { id } = await behaviorModel.create(
      teacherId,
      classId,
      helpedClassmate
    )

    expect(await behaviorModel.list(otherTeacherId, classId)).toEqual([])
    expect(
      await behaviorModel.findOwned(otherTeacherId, classId, id)
    ).toBeUndefined()
    await expect(
      behaviorModel.create(otherTeacherId, classId, helpedClassmate)
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(
      behaviorModel.update(otherTeacherId, classId, id, helpedClassmate)
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(
      behaviorModel.remove(otherTeacherId, classId, id)
    ).rejects.toBeInstanceOf(NotFoundError)

    await classModel.archive(teacherId, classId)
    expect(await behaviorModel.list(teacherId, classId)).toEqual([])
    await expect(
      behaviorModel.remove(teacherId, classId, id)
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  test('treats a removed behavior and a malformed id as not found', async () => {
    const teacherId = await newTeacherId()
    const { id: classId } = await newClassOf(teacherId)
    const { id } = await behaviorModel.create(
      teacherId,
      classId,
      helpedClassmate
    )
    await behaviorModel.remove(teacherId, classId, id)

    await expect(
      behaviorModel.update(teacherId, classId, id, helpedClassmate)
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(
      behaviorModel.remove(teacherId, classId, 'not-an-id')
    ).rejects.toBeInstanceOf(NotFoundError)
    expect(
      await behaviorModel.findOwned(teacherId, 'not-an-id', id)
    ).toBeUndefined()
  })

  describe('award', () => {
    test('gives each student one entry of the same batch', async () => {
      const { teacherId, classId, behaviorId, studentIds } =
        await newAwardScenario(10)

      const { batchId, studentCount } = await behaviorModel.award(
        teacherId,
        classId,
        behaviorId,
        studentIds
      )

      expect(studentCount).toBe(2)
      const entries = await database
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.batchId, batchId))
      expect(entries).toHaveLength(2)
      expect(await balancesOf(classId, studentIds)).toEqual([
        { xp: 10, hp: 50, coins: 5 },
        { xp: 10, hp: 50, coins: 5 }
      ])
    })

    test('applies nothing when a student is not in the class', async () => {
      const { teacherId, classId, behaviorId, studentIds } =
        await newAwardScenario()
      const { id: otherClassId } = await newClassOf(teacherId)
      const outsider = await newStudentIn(otherClassId)

      await expect(
        behaviorModel.award(teacherId, classId, behaviorId, [
          ...studentIds,
          outsider
        ])
      ).rejects.toBeInstanceOf(NotFoundError)

      expect(await balancesOf(classId, studentIds)).toEqual([
        { xp: 0, hp: 50, coins: 0 },
        { xp: 0, hp: 50, coins: 0 }
      ])
    })

    test('rejects the behavior of another teacher', async () => {
      const { classId, behaviorId, studentIds } = await newAwardScenario()
      const otherTeacherId = await newTeacherId()

      await expect(
        behaviorModel.award(otherTeacherId, classId, behaviorId, studentIds)
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('undoAward', () => {
    test('restores every student, level bonus included', async () => {
      const { teacherId, classId, behaviorId, studentIds } =
        await newAwardScenario()
      const { batchId } = await behaviorModel.award(
        teacherId,
        classId,
        behaviorId,
        studentIds
      )

      await behaviorModel.undoAward(teacherId, classId, batchId)

      expect(await balancesOf(classId, studentIds)).toEqual([
        { xp: 0, hp: 50, coins: 0 },
        { xp: 0, hp: 50, coins: 0 }
      ])
    })

    test('a batch is undone only once, even at the same time', async () => {
      const { teacherId, classId, behaviorId, studentIds } =
        await newAwardScenario()
      const { batchId } = await behaviorModel.award(
        teacherId,
        classId,
        behaviorId,
        studentIds
      )

      const results = await Promise.allSettled([
        behaviorModel.undoAward(teacherId, classId, batchId),
        behaviorModel.undoAward(teacherId, classId, batchId)
      ])

      const rejected = results.filter(({ status }) => status === 'rejected')
      expect(rejected).toHaveLength(1)
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ValidationError
      )
    })

    test('hides the batch from another teacher', async () => {
      const { teacherId, classId, behaviorId, studentIds } =
        await newAwardScenario()
      const { batchId } = await behaviorModel.award(
        teacherId,
        classId,
        behaviorId,
        studentIds
      )
      const otherTeacherId = await newTeacherId()

      await expect(
        behaviorModel.undoAward(otherTeacherId, classId, batchId)
      ).rejects.toBeInstanceOf(NotFoundError)
      const otherClass = await newClassOf(otherTeacherId)
      await expect(
        behaviorModel.undoAward(otherTeacherId, otherClass.id, batchId)
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
