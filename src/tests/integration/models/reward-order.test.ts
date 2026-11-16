import { and, eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import {
  enrollments,
  ledgerEntries,
  rewardOrders,
  rewards,
  users
} from '@/infra/database/schema'
import { NotFoundError, ValidationError } from '@/infra/errors'
import { characterModel } from '@/models/character/model'
import type { CharacterInput } from '@/models/character/schema'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'
import { powerModel } from '@/models/power/model'
import { powerRequestModel } from '@/models/power-request/model'
import { rewardModel } from '@/models/reward/model'
import { rewardOrderModel } from '@/models/reward-order/model'
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

const newScenario = async ({ coins = 50 } = {}) => {
  const teacherId = await newUserId('teacher')
  const { id: classId } = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  const studentId = await newUserId('student')
  await database.insert(enrollments).values({ studentId, classId, coins })
  const newReward = async ({
    price = 20,
    stock
  }: { price?: number; stock?: number } = {}) =>
    rewardModel.create(teacherId, classId, {
      name: 'Recompensa da turma',
      description: '',
      price: String(price),
      stock: stock === undefined ? '' : String(stock)
    })
  return { teacherId, classId, studentId, newReward }
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

const stockOf = async (rewardId: string) => {
  const [reward] = await database
    .select({ stock: rewards.stock })
    .from(rewards)
    .where(eq(rewards.id, rewardId))
  return reward!.stock
}

const orderOf = async (orderId: string) => {
  const [order] = await database
    .select()
    .from(rewardOrders)
    .where(eq(rewardOrders.id, orderId))
  return order!
}

describe('rewardOrderModel', () => {
  describe('purchase', () => {
    test('debits the coins, takes a unit from the stock and leaves the order pending', async () => {
      const { classId, studentId, newReward } = await newScenario()
      const reward = await newReward({ price: 20, stock: 2 })

      const { id } = await rewardOrderModel.purchase(
        studentId,
        classId,
        reward.id
      )

      expect(await coinsOf(studentId, classId)).toBe(30)
      expect(await stockOf(reward.id)).toBe(1)
      const order = await orderOf(id)
      expect(order).toMatchObject({ status: 'pending', price: 20 })
      const [entry] = await database
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.id, order.purchaseEntryId))
      expect(entry).toMatchObject({
        type: 'reward_purchase',
        coinDelta: -20,
        sourceId: reward.id
      })
    })

    test('leaves a reward without a limit without a stock', async () => {
      const { classId, studentId, newReward } = await newScenario()
      const reward = await newReward()

      await rewardOrderModel.purchase(studentId, classId, reward.id)

      expect(await stockOf(reward.id)).toBeNull()
    })

    test('is refused when the coins reserved by a power request leave too few', async () => {
      const { teacherId, classId, studentId, newReward } = await newScenario({
        coins: 30
      })
      await characterModel.choose(studentId, classId, MAGE)
      const power = await powerModel.create(teacherId, classId, {
        characterClass: 'mage',
        name: 'Poder',
        description: '',
        cost: '20',
        minLevel: '1'
      })
      await powerRequestModel.request(studentId, classId, power.id)
      const reward = await newReward({ price: 20 })

      await expect(
        rewardOrderModel.purchase(studentId, classId, reward.id)
      ).rejects.toThrow(ValidationError)
      expect(await coinsOf(studentId, classId)).toBe(30)
    })

    test('is refused for a sold out reward', async () => {
      const { classId, studentId, newReward } = await newScenario()
      const reward = await newReward({ stock: 0 })

      await expect(
        rewardOrderModel.purchase(studentId, classId, reward.id)
      ).rejects.toThrow(ValidationError)
      expect(await coinsOf(studentId, classId)).toBe(50)
    })

    test('sells the last unit once when two purchases arrive together', async () => {
      const { classId, studentId, newReward } = await newScenario({
        coins: 100
      })
      const reward = await newReward({ price: 10, stock: 1 })

      const results = await Promise.allSettled([
        rewardOrderModel.purchase(studentId, classId, reward.id),
        rewardOrderModel.purchase(studentId, classId, reward.id)
      ])

      expect(
        results.filter(({ status }) => status === 'fulfilled')
      ).toHaveLength(1)
      expect(await stockOf(reward.id)).toBe(0)
      expect(await coinsOf(studentId, classId)).toBe(90)
    })

    test('spends the coins once when two purchases arrive together', async () => {
      const { classId, studentId, newReward } = await newScenario({
        coins: 30
      })
      const first = await newReward({ price: 20 })
      const second = await newReward({ price: 20 })

      const results = await Promise.allSettled([
        rewardOrderModel.purchase(studentId, classId, first.id),
        rewardOrderModel.purchase(studentId, classId, second.id)
      ])

      expect(
        results.filter(({ status }) => status === 'fulfilled')
      ).toHaveLength(1)
      expect(await coinsOf(studentId, classId)).toBe(10)
    })

    test('is refused for a removed reward, one of another class and after the student leaves', async () => {
      const { teacherId, classId, studentId, newReward } = await newScenario()
      const removed = await newReward()
      await rewardModel.remove(teacherId, classId, removed.id)
      const other = await newScenario()
      const ofOtherClass = await other.newReward()
      const kept = await newReward()

      await expect(
        rewardOrderModel.purchase(studentId, classId, removed.id)
      ).rejects.toThrow(NotFoundError)
      await expect(
        rewardOrderModel.purchase(studentId, classId, ofOtherClass.id)
      ).rejects.toThrow(NotFoundError)
      await enrollmentModel.remove(teacherId, classId, studentId)
      await expect(
        rewardOrderModel.purchase(studentId, classId, kept.id)
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('deliver and cancel', () => {
    test('delivering settles the order and keeps the coins spent', async () => {
      const { teacherId, classId, studentId, newReward } = await newScenario()
      const reward = await newReward({ price: 20 })
      const { id } = await rewardOrderModel.purchase(
        studentId,
        classId,
        reward.id
      )

      await rewardOrderModel.deliver(teacherId, classId, id)

      expect(await orderOf(id)).toMatchObject({
        status: 'delivered',
        decidedById: teacherId
      })
      expect(await coinsOf(studentId, classId)).toBe(30)
      await expect(
        rewardOrderModel.cancel(teacherId, classId, id)
      ).rejects.toThrow(NotFoundError)
    })

    test('canceling refunds the price paid and puts the unit back in stock', async () => {
      const { teacherId, classId, studentId, newReward } = await newScenario()
      const reward = await newReward({ price: 20, stock: 1 })
      const { id } = await rewardOrderModel.purchase(
        studentId,
        classId,
        reward.id
      )
      await rewardModel.update(teacherId, classId, reward.id, {
        name: 'Recompensa mais cara',
        description: '',
        price: '40',
        stock: '0'
      })

      await rewardOrderModel.cancel(teacherId, classId, id)

      expect(await coinsOf(studentId, classId)).toBe(50)
      expect(await stockOf(reward.id)).toBe(1)
      const order = await orderOf(id)
      expect(order.status).toBe('canceled')
      const [refund] = await database
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.id, order.refundEntryId!))
      expect(refund).toMatchObject({ type: 'reward_refund', coinDelta: 20 })
      await expect(
        rewardOrderModel.deliver(teacherId, classId, id)
      ).rejects.toThrow(NotFoundError)
    })

    test('refunds once when two cancellations arrive together', async () => {
      const { teacherId, classId, studentId, newReward } = await newScenario()
      const reward = await newReward({ price: 20 })
      const { id } = await rewardOrderModel.purchase(
        studentId,
        classId,
        reward.id
      )

      const results = await Promise.allSettled([
        rewardOrderModel.cancel(teacherId, classId, id),
        rewardOrderModel.cancel(teacherId, classId, id)
      ])

      expect(
        results.filter(({ status }) => status === 'fulfilled')
      ).toHaveLength(1)
      expect(await coinsOf(studentId, classId)).toBe(50)
    })

    test('the order of a student who left stays pending for the teacher', async () => {
      const { teacherId, classId, studentId, newReward } = await newScenario()
      const reward = await newReward({ price: 20 })
      const { id } = await rewardOrderModel.purchase(
        studentId,
        classId,
        reward.id
      )
      await enrollmentModel.remove(teacherId, classId, studentId)

      const listed = await rewardOrderModel.listPending(teacherId, classId)
      expect(listed!.orders).toEqual([
        expect.objectContaining({ id, studentLeft: true })
      ])
      expect(await rewardOrderModel.countPending(teacherId, classId)).toBe(1)
      await rewardOrderModel.cancel(teacherId, classId, id)
      expect(await coinsOf(studentId, classId)).toBe(50)
    })

    test("another teacher can't decide an order", async () => {
      const { classId, studentId, newReward } = await newScenario()
      const reward = await newReward()
      const { id } = await rewardOrderModel.purchase(
        studentId,
        classId,
        reward.id
      )
      const otherTeacherId = await newUserId('teacher')

      await expect(
        rewardOrderModel.deliver(otherTeacherId, classId, id)
      ).rejects.toThrow(NotFoundError)
      await expect(
        rewardOrderModel.cancel(otherTeacherId, classId, id)
      ).rejects.toThrow(NotFoundError)
      expect(await orderOf(id)).toMatchObject({ status: 'pending' })
    })
  })

  describe('listForStudent', () => {
    test('marks what the available coins and the stock allow, and lists the orders pending first', async () => {
      const { teacherId, classId, studentId, newReward } = await newScenario({
        coins: 50
      })
      const delivered = await newReward({ price: 10 })
      const pending = await newReward({ price: 15 })
      const soldOut = await newReward({ price: 5, stock: 0 })
      const expensive = await newReward({ price: 30 })
      const first = await rewardOrderModel.purchase(
        studentId,
        classId,
        delivered.id
      )
      await rewardOrderModel.deliver(teacherId, classId, first.id)
      const second = await rewardOrderModel.purchase(
        studentId,
        classId,
        pending.id
      )

      const listed = await rewardOrderModel.listForStudent(studentId, classId)

      expect(listed!.availableCoins).toBe(25)
      const byId = new Map(listed!.rewards.map((reward) => [reward.id, reward]))
      expect(byId.get(soldOut.id)).toMatchObject({ soldOut: true })
      expect(byId.get(expensive.id)).toMatchObject({ affordable: false })
      expect(byId.get(pending.id)).toMatchObject({
        soldOut: false,
        affordable: true
      })
      expect(listed!.orders.map(({ id }) => id)).toEqual([second.id, first.id])
    })
  })
})
