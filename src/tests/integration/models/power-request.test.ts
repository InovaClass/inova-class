import { and, eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import {
  enrollments,
  ledgerEntries,
  powerRequests,
  users
} from '@/infra/database/schema'
import { NotFoundError, ValidationError } from '@/infra/errors'
import { behaviorModel } from '@/models/behavior/model'
import { characterModel } from '@/models/character/model'
import type { CharacterInput } from '@/models/character/schema'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'
import { xpForLevel } from '@/models/ledger/level'
import { powerModel } from '@/models/power/model'
import { powerRequestModel } from '@/models/power-request/model'
import { orchestrator } from '@/tests/orchestrator'

const MAGE: CharacterInput = {
  characterClass: 'mage',
  bodyType: 'female',
  skin: 'olive',
  hairStyle: 'bob',
  hairColor: 'redhead',
  outfitColor: 'navy'
}

const newUserId = async (role: UserRole) => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role })
    .returning()
  return user!.id
}

const newScenario = async ({ xp = 0, coins = 50 } = {}) => {
  const teacherId = await newUserId('teacher')
  const { id: classId } = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  const studentId = await newUserId('student')
  await database.insert(enrollments).values({ studentId, classId, xp, coins })
  await characterModel.choose(studentId, classId, MAGE)
  const newPower = async ({ cost = 20, minLevel = 1 } = {}) =>
    powerModel.create(teacherId, classId, {
      characterClass: 'mage',
      name: 'Poder da turma',
      description: '',
      cost: String(cost),
      minLevel: String(minLevel)
    })
  return { teacherId, classId, studentId, newPower }
}

const coinsOf = async (studentId: string, classId: string) => {
  const [enrollment] = await database
    .select({ coins: enrollments.coins })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId)
      )
    )
  return enrollment!.coins
}

const statusOf = async (requestId: string) => {
  const [request] = await database
    .select({ status: powerRequests.status })
    .from(powerRequests)
    .where(eq(powerRequests.id, requestId))
  return request!.status
}

describe('powerRequestModel', () => {
  describe('request', () => {
    test('reserves the cost from the available coins without spending them', async () => {
      const { classId, studentId, newPower } = await newScenario()
      const power = await newPower({ cost: 20 })

      await powerRequestModel.request(studentId, classId, power.id)

      const listed = await powerRequestModel.listForStudent(studentId, classId)
      expect(listed).toMatchObject({ coins: 50, availableCoins: 30 })
      expect(listed!.powers.find(({ id }) => id === power.id)).toMatchObject({
        requested: true
      })
      expect(await coinsOf(studentId, classId)).toBe(50)
    })

    test('is refused when the available coins no longer cover the cost', async () => {
      const { classId, studentId, newPower } = await newScenario({ coins: 30 })
      const first = await newPower({ cost: 20 })
      const second = await newPower({ cost: 20 })
      await powerRequestModel.request(studentId, classId, first.id)

      await expect(
        powerRequestModel.request(studentId, classId, second.id)
      ).rejects.toThrow(ValidationError)
    })

    test('reserves the coins once when two requests arrive together', async () => {
      const { classId, studentId, newPower } = await newScenario({ coins: 30 })
      const first = await newPower({ cost: 20 })
      const second = await newPower({ cost: 20 })

      const results = await Promise.allSettled([
        powerRequestModel.request(studentId, classId, first.id),
        powerRequestModel.request(studentId, classId, second.id)
      ])

      expect(
        results.filter(({ status }) => status === 'fulfilled')
      ).toHaveLength(1)
    })

    test('is refused for a power already pending, a locked one and a disabled one', async () => {
      const { teacherId, classId, studentId, newPower } = await newScenario()
      const pending = await newPower()
      await powerRequestModel.request(studentId, classId, pending.id)
      const locked = await newPower({ minLevel: 2 })
      const disabled = await newPower()
      await powerModel.setEnabled(teacherId, classId, disabled.id, false)

      await expect(
        powerRequestModel.request(studentId, classId, pending.id)
      ).rejects.toThrow(ValidationError)
      await expect(
        powerRequestModel.request(studentId, classId, locked.id)
      ).rejects.toThrow(ValidationError)
      await expect(
        powerRequestModel.request(studentId, classId, disabled.id)
      ).rejects.toThrow(NotFoundError)
    })

    test('accepts a power once the level reaches its minimum', async () => {
      const { classId, studentId, newPower } = await newScenario({
        xp: xpForLevel(2)
      })
      const power = await newPower({ minLevel: 2 })

      await expect(
        powerRequestModel.request(studentId, classId, power.id)
      ).resolves.toBeDefined()
    })

    test('is refused for a power of another character class', async () => {
      const { teacherId, classId, studentId } = await newScenario()
      const warriorPower = await powerModel.create(teacherId, classId, {
        characterClass: 'warrior',
        name: 'Poder de guerreiro',
        description: '',
        cost: '10',
        minLevel: '1'
      })

      await expect(
        powerRequestModel.request(studentId, classId, warriorPower.id)
      ).rejects.toThrow(NotFoundError)
    })
  })

  test('canceling a request releases its reservation', async () => {
    const { classId, studentId, newPower } = await newScenario()
    const power = await newPower({ cost: 20 })
    const { id } = await powerRequestModel.request(studentId, classId, power.id)

    await powerRequestModel.cancel(studentId, classId, id)

    expect(await statusOf(id)).toBe('canceled')
    expect(
      await powerRequestModel.listForStudent(studentId, classId)
    ).toMatchObject({ availableCoins: 50, pending: [] })
  })

  describe('approve', () => {
    test('spends the coins through a power entry pointing to the power', async () => {
      const { teacherId, classId, studentId, newPower } = await newScenario()
      const power = await newPower({ cost: 20 })
      const { id } = await powerRequestModel.request(
        studentId,
        classId,
        power.id
      )

      await powerRequestModel.approve(teacherId, classId, id)

      expect(await coinsOf(studentId, classId)).toBe(30)
      expect(await statusOf(id)).toBe('approved')
      const [request] = await database
        .select({ entry: ledgerEntries })
        .from(powerRequests)
        .innerJoin(
          ledgerEntries,
          eq(ledgerEntries.id, powerRequests.ledgerEntryId)
        )
        .where(eq(powerRequests.id, id))
      expect(request!.entry).toMatchObject({
        type: 'power',
        coinDelta: -20,
        sourceId: power.id,
        createdById: teacherId
      })
      expect(
        await powerRequestModel.listForStudent(studentId, classId)
      ).toMatchObject({ coins: 30, availableCoins: 30, pending: [] })
    })

    test('goes through once when two approvals arrive together', async () => {
      const { teacherId, classId, studentId, newPower } = await newScenario()
      const power = await newPower({ cost: 20 })
      const { id } = await powerRequestModel.request(
        studentId,
        classId,
        power.id
      )

      const results = await Promise.allSettled([
        powerRequestModel.approve(teacherId, classId, id),
        powerRequestModel.approve(teacherId, classId, id)
      ])

      expect(
        results.filter(({ status }) => status === 'fulfilled')
      ).toHaveLength(1)
      expect(await coinsOf(studentId, classId)).toBe(30)
    })

    test('is refused when a penalty left fewer coins than the cost, keeping the request pending', async () => {
      const { teacherId, classId, studentId, newPower } = await newScenario({
        coins: 20
      })
      const power = await newPower({ cost: 20 })
      const { id } = await powerRequestModel.request(
        studentId,
        classId,
        power.id
      )
      const penalty = await behaviorModel.create(teacherId, classId, {
        name: 'Multa',
        xp: '0',
        hp: '0',
        coins: '-5'
      })
      await behaviorModel.award(teacherId, classId, penalty.id, [studentId])

      await expect(
        powerRequestModel.approve(teacherId, classId, id)
      ).rejects.toThrow(ValidationError)
      expect(await statusOf(id)).toBe('pending')
      expect(await coinsOf(studentId, classId)).toBe(15)
    })

    test('is refused for a request of another teacher or one already refused', async () => {
      const { teacherId, classId, studentId, newPower } = await newScenario()
      const power = await newPower()
      const { id } = await powerRequestModel.request(
        studentId,
        classId,
        power.id
      )
      const otherTeacherId = await newUserId('teacher')

      await expect(
        powerRequestModel.approve(otherTeacherId, classId, id)
      ).rejects.toThrow(NotFoundError)

      await powerRequestModel.refuse(teacherId, classId, id)

      await expect(
        powerRequestModel.approve(teacherId, classId, id)
      ).rejects.toThrow(NotFoundError)
      expect(await coinsOf(studentId, classId)).toBe(50)
    })
  })

  test('refusing a request releases its reservation without an entry', async () => {
    const { teacherId, classId, studentId, newPower } = await newScenario()
    const power = await newPower({ cost: 20 })
    const { id } = await powerRequestModel.request(studentId, classId, power.id)

    await powerRequestModel.refuse(teacherId, classId, id)

    expect(await statusOf(id)).toBe('refused')
    expect(
      await powerRequestModel.listForStudent(studentId, classId)
    ).toMatchObject({ coins: 50, availableCoins: 50 })
  })

  test('removing the student refuses the pending requests', async () => {
    const { teacherId, classId, studentId, newPower } = await newScenario()
    const power = await newPower()
    const { id } = await powerRequestModel.request(studentId, classId, power.id)

    await enrollmentModel.remove(teacherId, classId, studentId)

    expect(await statusOf(id)).toBe('refused')
    expect(await powerRequestModel.countPending(teacherId, classId)).toBe(0)
  })

  test('lists the pending requests of the class with the power', async () => {
    const { teacherId, classId, studentId, newPower } = await newScenario()
    const power = await newPower({ cost: 20 })
    const { id } = await powerRequestModel.request(studentId, classId, power.id)

    const listed = await powerRequestModel.listPending(teacherId, classId)

    expect(listed!.requests).toEqual([
      expect.objectContaining({
        id,
        studentId,
        powerName: power.name,
        cost: 20
      })
    ])
    expect(await powerRequestModel.countPending(teacherId, classId)).toBe(1)
    expect(
      await powerRequestModel.listPending(await newUserId('teacher'), classId)
    ).toBeUndefined()
  })
})
