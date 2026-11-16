import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import {
  accounts,
  classes,
  enrollments,
  rewardOrders,
  rewards,
  users
} from '@/infra/database/schema'

import type { Transaction } from './ledger-repo'

const isPending = eq(rewardOrders.status, 'pending')

const findActiveEnrollment = async (studentId: string, classId: string) => {
  const [enrollment] = await database
    .select({ id: enrollments.id })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId),
        isNull(enrollments.endedAt),
        isNull(classes.archivedAt)
      )
    )
  return enrollment
}

const insert = async (
  transaction: Transaction,
  order: Pick<
    typeof rewardOrders.$inferInsert,
    'enrollmentId' | 'rewardId' | 'price' | 'purchaseEntryId'
  >
) => {
  const [created] = await transaction
    .insert(rewardOrders)
    .values(order)
    .returning({ id: rewardOrders.id })
  return created!
}

// The enrollment may have ended: the coins already left, so the order still waits for a decision
const findPending = async (classId: string, orderId: string) => {
  const [order] = await database
    .select({
      id: rewardOrders.id,
      enrollmentId: rewardOrders.enrollmentId,
      rewardId: rewardOrders.rewardId,
      price: rewardOrders.price
    })
    .from(rewardOrders)
    .innerJoin(enrollments, eq(enrollments.id, rewardOrders.enrollmentId))
    .where(
      and(
        eq(rewardOrders.id, orderId),
        isPending,
        eq(enrollments.classId, classId)
      )
    )
  return order
}

// Only a pending order is settled, so a concurrent decision on the same order finds nothing here
// and the transaction around it is rolled back
const settle = async (
  classId: string,
  orderId: string,
  fields:
    | { status: 'delivered'; decidedById: string }
    | { status: 'canceled'; refundEntryId: string; decidedById: string },
  transaction?: Transaction
) => {
  const executor = transaction ?? database
  const ofClass = executor
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(eq(enrollments.classId, classId))
  const [settled] = await executor
    .update(rewardOrders)
    .set({ ...fields, decidedAt: new Date() })
    .where(
      and(
        eq(rewardOrders.id, orderId),
        isPending,
        inArray(rewardOrders.enrollmentId, ofClass)
      )
    )
    .returning({ id: rewardOrders.id })
  return settled
}

const pendingOfClass = (classId: string) =>
  and(isPending, eq(enrollments.classId, classId))

const listPendingOfClass = async (classId: string) =>
  database
    .select({
      id: rewardOrders.id,
      price: rewardOrders.price,
      createdAt: rewardOrders.createdAt,
      rewardName: rewards.name,
      studentName: users.name,
      studentEmail: users.email,
      studentUsername: users.username,
      // A subquery, since a join would repeat the order for a user with two accounts
      studentPending: sql<boolean>`not exists (select 1 from ${accounts} where ${accounts.userId} = ${users.id})`,
      enrollmentEndedAt: enrollments.endedAt
    })
    .from(rewardOrders)
    .innerJoin(enrollments, eq(enrollments.id, rewardOrders.enrollmentId))
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .innerJoin(rewards, eq(rewards.id, rewardOrders.rewardId))
    .where(pendingOfClass(classId))
    .orderBy(asc(rewardOrders.createdAt), asc(rewardOrders.id))

const countPendingOfOwnedClass = async (teacherId: string, classId: string) => {
  const [result] = await database
    .select({ pending: count() })
    .from(rewardOrders)
    .innerJoin(enrollments, eq(enrollments.id, rewardOrders.enrollmentId))
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(and(pendingOfClass(classId), eq(classes.teacherId, teacherId)))
  return result!.pending
}

const listOfEnrollment = async (enrollmentId: string, limit: number) =>
  database
    .select({
      id: rewardOrders.id,
      price: rewardOrders.price,
      status: rewardOrders.status,
      createdAt: rewardOrders.createdAt,
      rewardName: rewards.name
    })
    .from(rewardOrders)
    .innerJoin(rewards, eq(rewards.id, rewardOrders.rewardId))
    .where(eq(rewardOrders.enrollmentId, enrollmentId))
    .orderBy(
      desc(isPending),
      desc(rewardOrders.createdAt),
      desc(rewardOrders.id)
    )
    .limit(limit)

export const rewardOrderRepo = {
  findActiveEnrollment,
  insert,
  findPending,
  settle,
  listPendingOfClass,
  countPendingOfOwnedClass,
  listOfEnrollment
}
