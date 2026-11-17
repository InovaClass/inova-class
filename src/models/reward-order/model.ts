import { z } from 'zod'

import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { classEventModel } from '@/models/class-event/model'
import { ledgerModel } from '@/models/ledger/model'
import { availableCoins } from '@/models/power-request/balance'
import { rewardNotFound } from '@/models/reward/errors'
import { powerRequestRepo } from '@/repositories/power-request-repo'
import { rewardOrderRepo } from '@/repositories/reward-order-repo'
import { rewardRepo } from '@/repositories/reward-repo'

import { STUDENT_ORDERS_LIMIT } from './constants'
import { orderNotFound } from './errors'
import { checkPurchase } from './purchase'

// The ids come from the URL or the client, and Postgres rejects a value that isn't a UUID
const isId = (id: string) => z.uuid().safeParse(id).success

const announce = (classId: string) =>
  classEventModel.publish(classId, 'reward-order')

const purchase = async (
  studentId: string,
  classId: string,
  rewardId: string
) => {
  if (!isId(classId)) throw classNotFound()
  if (!isId(rewardId)) throw rewardNotFound()
  const enrollment = await rewardOrderRepo.findActiveEnrollment(
    studentId,
    classId
  )
  if (!enrollment) throw classNotFound()

  let order: { id: string } | undefined
  let paid = 0
  await ledgerModel.spendOnReward(
    enrollment.id,
    { rewardId, createdById: studentId },
    {
      claim: async (transaction, { coins }) => {
        const reward = await rewardRepo.lockForPurchase(transaction, {
          enrollmentId: enrollment.id,
          rewardId
        })
        if (!reward) throw rewardNotFound()
        const pending = await powerRequestRepo.pendingOf(
          transaction,
          enrollment.id
        )
        checkPurchase({
          availableCoins: availableCoins(coins, pending),
          price: reward.price,
          stock: reward.stock
        })
        await rewardRepo.changeStock(transaction, rewardId, -1)
        paid = reward.price
        return reward.price
      },
      confirm: async (transaction, entryId) => {
        order = await rewardOrderRepo.insert(transaction, {
          enrollmentId: enrollment.id,
          rewardId,
          price: paid,
          purchaseEntryId: entryId
        })
      }
    }
  )
  await announce(classId)
  return order!
}

const listForStudent = async (studentId: string, classId: string) => {
  const enrollment = isId(classId)
    ? await rewardOrderRepo.findActiveEnrollment(studentId, classId)
    : undefined
  if (!enrollment) return

  const [reservations, rewards, orders] = await Promise.all([
    powerRequestRepo.findReservations(studentId, classId),
    rewardRepo.listOfStudent(studentId, classId),
    rewardOrderRepo.listOfEnrollment(enrollment.id, STUDENT_ORDERS_LIMIT)
  ])
  if (!reservations) return
  const available = availableCoins(reservations.coins, reservations.pending)
  return {
    availableCoins: available,
    reservedCoins: reservations.coins - available,
    rewards: rewards.map((reward) => ({
      ...reward,
      soldOut: reward.stock === 0,
      affordable: available >= reward.price
    })),
    orders
  }
}

const requireOwnedClass = async (teacherId: string, classId: string) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  return schoolClass
}

const deliver = async (teacherId: string, classId: string, orderId: string) => {
  const schoolClass = await requireOwnedClass(teacherId, classId)
  const delivered = isId(orderId)
    ? await rewardOrderRepo.settle(schoolClass.id, orderId, {
        status: 'delivered',
        decidedById: teacherId
      })
    : undefined
  if (!delivered) throw orderNotFound()
  await announce(schoolClass.id)
}

// The refund, the cancellation and the unit back in stock go in one transaction
const cancel = async (teacherId: string, classId: string, orderId: string) => {
  const schoolClass = await requireOwnedClass(teacherId, classId)
  const pending = isId(orderId)
    ? await rewardOrderRepo.findPending(schoolClass.id, orderId)
    : undefined
  if (!pending) throw orderNotFound()

  await ledgerModel.refundReward(
    pending.enrollmentId,
    {
      rewardId: pending.rewardId,
      price: pending.price,
      createdById: teacherId
    },
    async (transaction, entryId) => {
      const canceled = await rewardOrderRepo.settle(
        schoolClass.id,
        orderId,
        { status: 'canceled', refundEntryId: entryId, decidedById: teacherId },
        transaction
      )
      if (!canceled) throw orderNotFound()
      await rewardRepo.changeStock(transaction, pending.rewardId, 1)
    }
  )
  await announce(schoolClass.id)
}

const listPending = async (teacherId: string, classId: string) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) return
  const orders = await rewardOrderRepo.listPendingOfClass(schoolClass.id)
  return {
    schoolClass,
    orders: orders.map(
      ({
        studentEmail,
        studentUsername,
        studentPending,
        enrollmentEndedAt,
        ...order
      }) => ({
        ...order,
        // Same rule as the roster: only a pending student's email is the teacher's to see
        studentDetail: studentPending ? studentEmail : studentUsername,
        studentLeft: enrollmentEndedAt !== null
      })
    )
  }
}

const countPending = async (teacherId: string, classId: string) =>
  isId(classId)
    ? rewardOrderRepo.countPendingOfOwnedClass(teacherId, classId)
    : 0

export const rewardOrderModel = {
  purchase,
  listForStudent,
  deliver,
  cancel,
  listPending,
  countPending
}
