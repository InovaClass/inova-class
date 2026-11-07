import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { database } from '@/infra/database/client'
import { users } from '@/infra/database/schema'
import { NotFoundError } from '@/infra/errors'
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
})
