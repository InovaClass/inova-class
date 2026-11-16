import { and, asc, count, eq, exists, isNull, sql } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import {
  accounts,
  classes,
  enrollments,
  powerRequests,
  powers,
  users
} from '@/infra/database/schema'

import type { Transaction } from './ledger-repo'

type PendingRequest = { id: string; powerId: string; cost: number }

export type ReservationState = {
  xp: number
  coins: number
  power: { id: string; cost: number; minLevel: number } | undefined
  pending: PendingRequest[]
}

const isPending = eq(powerRequests.status, 'pending')

const activeEnrollmentOf = (studentId: string, classId: string) =>
  and(
    eq(enrollments.studentId, studentId),
    eq(enrollments.classId, classId),
    isNull(enrollments.endedAt),
    isNull(classes.archivedAt)
  )

const pendingOf = async (transaction: Transaction, enrollmentId: string) =>
  transaction
    .select({
      id: powerRequests.id,
      powerId: powerRequests.powerId,
      cost: powerRequests.cost
    })
    .from(powerRequests)
    .where(and(eq(powerRequests.enrollmentId, enrollmentId), isPending))

// The lock of the enrollment is the one the ledger takes, so a reservation never reads the coins
// while an entry is changing them, and two requests never reserve the same coins. `check` may throw
// to cancel the transaction
const reserve = async (
  studentId: string,
  classId: string,
  powerId: string,
  check: (state: ReservationState) => void
) =>
  database.transaction(async (transaction) => {
    const [enrollment] = await transaction
      .select({
        id: enrollments.id,
        xp: enrollments.xp,
        coins: enrollments.coins,
        characterClass: enrollments.characterClass
      })
      .from(enrollments)
      .innerJoin(classes, eq(classes.id, enrollments.classId))
      .where(activeEnrollmentOf(studentId, classId))
      .for('update', { of: enrollments })
    if (!enrollment) return

    const [power] = enrollment.characterClass
      ? await transaction
          .select({
            id: powers.id,
            cost: powers.cost,
            minLevel: powers.minLevel
          })
          .from(powers)
          .where(
            and(
              eq(powers.id, powerId),
              eq(powers.classId, classId),
              eq(powers.characterClass, enrollment.characterClass),
              isNull(powers.removedAt),
              isNull(powers.disabledAt)
            )
          )
      : []
    const pending = await pendingOf(transaction, enrollment.id)
    check({ xp: enrollment.xp, coins: enrollment.coins, power, pending })

    const [created] = await transaction
      .insert(powerRequests)
      .values({ enrollmentId: enrollment.id, powerId, cost: power!.cost })
      .returning({ id: powerRequests.id })
    return created!
  })

// The power isn't filtered: a request made before the teacher disabled or removed the power still
// holds its coins until someone decides it
const findReservations = async (studentId: string, classId: string) => {
  const [enrollment] = await database
    .select({ id: enrollments.id, coins: enrollments.coins })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(activeEnrollmentOf(studentId, classId))
  if (!enrollment) return

  const pending = await database
    .select({
      id: powerRequests.id,
      powerId: powerRequests.powerId,
      powerName: powers.name,
      cost: powerRequests.cost
    })
    .from(powerRequests)
    .innerJoin(powers, eq(powers.id, powerRequests.powerId))
    .where(and(eq(powerRequests.enrollmentId, enrollment.id), isPending))
    .orderBy(asc(powerRequests.createdAt), asc(powerRequests.id))
  return { coins: enrollment.coins, pending }
}

const activeEnrollmentOfRequest = (classId: string, studentId?: string) => {
  const enrollment = and(
    eq(enrollments.id, powerRequests.enrollmentId),
    eq(enrollments.classId, classId),
    studentId ? eq(enrollments.studentId, studentId) : undefined,
    isNull(enrollments.endedAt)
  )
  return exists(
    database.select({ id: enrollments.id }).from(enrollments).where(enrollment)
  )
}

const cancel = async (
  studentId: string,
  classId: string,
  requestId: string
) => {
  const [canceled] = await database
    .update(powerRequests)
    .set({ status: 'canceled', decidedById: studentId, decidedAt: new Date() })
    .where(
      and(
        eq(powerRequests.id, requestId),
        isPending,
        activeEnrollmentOfRequest(classId, studentId)
      )
    )
    .returning({ id: powerRequests.id })
  return canceled
}

const findPending = async (classId: string, requestId: string) => {
  const [request] = await database
    .select({
      id: powerRequests.id,
      enrollmentId: powerRequests.enrollmentId,
      powerId: powerRequests.powerId,
      cost: powerRequests.cost
    })
    .from(powerRequests)
    .innerJoin(enrollments, eq(enrollments.id, powerRequests.enrollmentId))
    .where(
      and(
        eq(powerRequests.id, requestId),
        isPending,
        eq(enrollments.classId, classId),
        isNull(enrollments.endedAt)
      )
    )
  return request
}

// Only a pending request is settled, so a concurrent decision on the same request finds nothing here
// and the transaction around it is rolled back
const settle = async (
  classId: string,
  requestId: string,
  fields:
    | { status: 'approved'; ledgerEntryId: string; decidedById: string }
    | { status: 'refused'; decidedById: string },
  transaction?: Transaction
) => {
  const [settled] = await (transaction ?? database)
    .update(powerRequests)
    .set({ ...fields, decidedAt: new Date() })
    .where(
      and(
        eq(powerRequests.id, requestId),
        isPending,
        activeEnrollmentOfRequest(classId)
      )
    )
    .returning({ id: powerRequests.id })
  return settled
}

const pendingOfClass = (classId: string) =>
  and(isPending, eq(enrollments.classId, classId), isNull(enrollments.endedAt))

const listPendingOfClass = async (classId: string) =>
  database
    .select({
      id: powerRequests.id,
      cost: powerRequests.cost,
      createdAt: powerRequests.createdAt,
      studentId: users.id,
      studentName: users.name,
      studentEmail: users.email,
      studentUsername: users.username,
      // A subquery, since a join would repeat the request for a user with two accounts
      studentPending: sql<boolean>`not exists (select 1 from ${accounts} where ${accounts.userId} = ${users.id})`,
      powerName: powers.name
    })
    .from(powerRequests)
    .innerJoin(enrollments, eq(enrollments.id, powerRequests.enrollmentId))
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .innerJoin(powers, eq(powers.id, powerRequests.powerId))
    .where(pendingOfClass(classId))
    .orderBy(asc(powerRequests.createdAt), asc(powerRequests.id))

const countPendingOfOwnedClass = async (teacherId: string, classId: string) => {
  const [result] = await database
    .select({ pending: count() })
    .from(powerRequests)
    .innerJoin(enrollments, eq(enrollments.id, powerRequests.enrollmentId))
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(and(pendingOfClass(classId), eq(classes.teacherId, teacherId)))
  return result!.pending
}

export const powerRequestRepo = {
  reserve,
  findReservations,
  cancel,
  findPending,
  settle,
  listPendingOfClass,
  countPendingOfOwnedClass
}
