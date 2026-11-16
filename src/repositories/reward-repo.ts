import { and, asc, eq, exists, isNotNull, isNull, sql } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { classes, enrollments, rewards } from '@/infra/database/schema'

import type { Transaction } from './ledger-repo'

export type RewardFields = Pick<
  typeof rewards.$inferInsert,
  'name' | 'description' | 'price' | 'stock'
>

const rewardColumns = {
  id: rewards.id,
  name: rewards.name,
  description: rewards.description,
  price: rewards.price,
  stock: rewards.stock
}

const rewardOrder = [asc(rewards.price), asc(rewards.name)]

const activeClassOf = (teacherId: string, classId: string) => {
  const ownedClass = and(
    eq(classes.id, classId),
    eq(classes.teacherId, teacherId),
    isNull(classes.archivedAt)
  )
  return exists(
    database.select({ id: classes.id }).from(classes).where(ownedClass)
  )
}

const activeRewardsOf = (teacherId: string, classId: string) =>
  and(
    eq(rewards.classId, classId),
    isNull(rewards.removedAt),
    activeClassOf(teacherId, classId)
  )

const activeRewardOf = (teacherId: string, classId: string, rewardId: string) =>
  and(eq(rewards.id, rewardId), activeRewardsOf(teacherId, classId))

const listActive = async (teacherId: string, classId: string) =>
  database
    .select(rewardColumns)
    .from(rewards)
    .where(activeRewardsOf(teacherId, classId))
    .orderBy(...rewardOrder)

// Joined on the enrollment, so a student who left and an archived class get no rows
const listOfStudent = async (studentId: string, classId: string) =>
  database
    .select(rewardColumns)
    .from(rewards)
    .innerJoin(enrollments, eq(enrollments.classId, rewards.classId))
    .innerJoin(classes, eq(classes.id, rewards.classId))
    .where(
      and(
        eq(rewards.classId, classId),
        isNull(rewards.removedAt),
        eq(enrollments.studentId, studentId),
        isNull(enrollments.endedAt),
        isNull(classes.archivedAt)
      )
    )
    .orderBy(...rewardOrder)

const findActive = async (
  teacherId: string,
  classId: string,
  rewardId: string
) => {
  const [reward] = await database
    .select(rewardColumns)
    .from(rewards)
    .where(activeRewardOf(teacherId, classId, rewardId))
  return reward
}

const insert = async (classId: string, fields: RewardFields) => {
  const [reward] = await database
    .insert(rewards)
    .values({ classId, ...fields })
    .returning(rewardColumns)
  return reward!
}

const updateActive = async (
  teacherId: string,
  classId: string,
  rewardId: string,
  fields: RewardFields
) => {
  const [reward] = await database
    .update(rewards)
    .set(fields)
    .where(activeRewardOf(teacherId, classId, rewardId))
    .returning(rewardColumns)
  return reward
}

const removeActive = async (
  teacherId: string,
  classId: string,
  rewardId: string
) => {
  const [reward] = await database
    .update(rewards)
    .set({ removedAt: new Date() })
    .where(activeRewardOf(teacherId, classId, rewardId))
    .returning({ id: rewards.id })
  return reward
}

// Locks the reward, so two purchases of the last unit wait for each other. Checked against the
// enrollment and the class again, since the purchase looked them up before taking the lock
const lockForPurchase = async (
  transaction: Transaction,
  { enrollmentId, rewardId }: { enrollmentId: string; rewardId: string }
) => {
  const activeEnrollment = and(
    eq(enrollments.id, enrollmentId),
    eq(enrollments.classId, rewards.classId),
    isNull(enrollments.endedAt),
    isNull(classes.archivedAt)
  )
  const enrollmentOfReward = transaction
    .select({ id: enrollments.id })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(activeEnrollment)
  const [reward] = await transaction
    .select({ id: rewards.id, price: rewards.price, stock: rewards.stock })
    .from(rewards)
    .where(
      and(
        eq(rewards.id, rewardId),
        isNull(rewards.removedAt),
        exists(enrollmentOfReward)
      )
    )
    .for('update')
  return reward
}

const changeStock = async (
  transaction: Transaction,
  rewardId: string,
  change: 1 | -1
) =>
  transaction
    .update(rewards)
    .set({ stock: sql`${rewards.stock} + ${change}` })
    .where(and(eq(rewards.id, rewardId), isNotNull(rewards.stock)))

export const rewardRepo = {
  listActive,
  listOfStudent,
  findActive,
  insert,
  updateActive,
  removeActive,
  lockForPurchase,
  changeStock
}
