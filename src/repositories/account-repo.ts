import {
  and,
  asc,
  count,
  countDistinct,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  notExists,
  sql
} from 'drizzle-orm'

import { database } from '@/infra/database/client'
import {
  accounts,
  classes,
  enrollments,
  rewardOrders,
  rewards,
  users,
  verificationResends,
  verifications
} from '@/infra/database/schema'

type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0]

// Every enrollment counts, ended ones included: the history of a class keeps a student who left it
// (#16), so deleting the account would take entries out of another teacher's class
const createdOnlyInClassesOf = (teacherId: string) => {
  const inOtherClass = and(
    eq(enrollments.studentId, users.id),
    ne(classes.teacherId, teacherId)
  )
  const enrollmentsElsewhere = database
    .select({ id: enrollments.id })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(inOtherClass)
  return and(
    eq(users.role, 'student'),
    eq(users.createdById, teacherId),
    notExists(enrollmentsElsewhere)
  )
}

const withoutSignInMethod = notExists(
  database
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, users.id))
)

const hasPassword = async (userId: string) => {
  const [credential] = await database
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.providerId, 'credential'),
        isNotNull(accounts.password)
      )
    )
  return credential !== undefined
}

const countClassesAndStudents = async (teacherId: string) => {
  const [totals] = await database
    .select({
      classCount: countDistinct(classes.id),
      studentCount: countDistinct(enrollments.studentId)
    })
    .from(classes)
    .leftJoin(
      enrollments,
      and(eq(enrollments.classId, classes.id), isNull(enrollments.endedAt))
    )
    .where(eq(classes.teacherId, teacherId))
  return totals!
}

const countStudentClasses = async (studentId: string) => {
  const [totals] = await database
    .select({ classCount: count() })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        isNull(enrollments.endedAt),
        isNull(classes.archivedAt)
      )
    )
  return totals!
}

const listDeletableStudents = async (
  teacherId: string,
  studentIds: string[]
) => {
  if (studentIds.length === 0) return []
  const rows = await database
    .select({ id: users.id })
    .from(users)
    .where(
      and(inArray(users.id, studentIds), createdOnlyInClassesOf(teacherId))
    )
  return rows.map(({ id }) => id)
}

// The enrollments are locked in the order of their ids, as `ledgerRepo` does, so a purchase running
// at the same time waits for the deletion instead of deadlocking with it
const deleteUsers = async (transaction: Transaction, userIds: string[]) => {
  const locked = await transaction
    .select({
      id: enrollments.id,
      classId: enrollments.classId,
      endedAt: enrollments.endedAt
    })
    .from(enrollments)
    .where(inArray(enrollments.studentId, userIds))
    .orderBy(asc(enrollments.id))
    .for('update')

  // The unit taken by an order nobody delivered goes back to the shop, as a refund would do (#21)
  const enrollmentIds = locked.map(({ id }) => id)
  const pendingUnits =
    enrollmentIds.length > 0
      ? await transaction
          .select({ rewardId: rewardOrders.rewardId, units: count() })
          .from(rewardOrders)
          .where(
            and(
              inArray(rewardOrders.enrollmentId, enrollmentIds),
              eq(rewardOrders.status, 'pending')
            )
          )
          .groupBy(rewardOrders.rewardId)
      : []
  for (const { rewardId, units } of pendingUnits) {
    await transaction
      .update(rewards)
      .set({ stock: sql`${rewards.stock} + ${units}` })
      .where(and(eq(rewards.id, rewardId), isNotNull(rewards.stock)))
  }

  const ownedClasses = await transaction
    .select({ id: classes.id })
    .from(classes)
    .where(inArray(classes.teacherId, userIds))

  const deleted = await transaction
    .delete(users)
    .where(inArray(users.id, userIds))
    .returning({ email: users.email, username: users.username })

  // Invites, password resets and the resend cooldown point to the account without a foreign key
  await transaction
    .delete(verifications)
    .where(inArray(verifications.value, userIds))
  const identifiers = deleted.flatMap(({ email, username }) =>
    [email, username].flatMap((value) => value?.toLowerCase() ?? [])
  )
  if (identifiers.length > 0) {
    await transaction
      .delete(verificationResends)
      .where(inArray(verificationResends.identifier, identifiers))
  }

  return {
    classIds: [
      ...new Set([
        ...locked.flatMap(({ classId, endedAt }) => (endedAt ? [] : classId)),
        ...ownedClasses.map(({ id }) => id)
      ])
    ]
  }
}

// The invited students who never signed in and have nothing in another teacher's class only hold
// what this teacher typed in, so they leave with the teacher
const deleteTeacher = async (teacherId: string) =>
  database.transaction(async (transaction) => {
    const pendingStudents = await transaction
      .select({ id: users.id })
      .from(users)
      .where(and(createdOnlyInClassesOf(teacherId), withoutSignInMethod))
      .for('update')
    return deleteUsers(transaction, [
      teacherId,
      ...pendingStudents.map(({ id }) => id)
    ])
  })

const deleteStudent = async (studentId: string) =>
  database.transaction(async (transaction) =>
    deleteUsers(transaction, [studentId])
  )

// Locking the student keeps another teacher from enrolling them while the account is deleted
const deleteInvitedStudent = async (
  teacherId: string,
  classId: string,
  studentId: string
) =>
  database.transaction(async (transaction) => {
    const [student] = await transaction
      .select({ id: users.id })
      .from(users)
      .innerJoin(enrollments, eq(enrollments.studentId, users.id))
      .where(
        and(
          eq(users.id, studentId),
          eq(enrollments.classId, classId),
          isNull(enrollments.endedAt),
          createdOnlyInClassesOf(teacherId)
        )
      )
      .for('update', { of: users })
    if (!student) return
    return deleteUsers(transaction, [student.id])
  })

export const accountRepo = {
  hasPassword,
  countClassesAndStudents,
  countStudentClasses,
  listDeletableStudents,
  deleteTeacher,
  deleteStudent,
  deleteInvitedStudent
}
