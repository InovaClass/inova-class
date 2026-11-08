import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import {
  accounts,
  classes,
  enrollments,
  joinAttempts,
  users
} from '@/infra/database/schema'

// A student who comes back keeps the same enrollment, and the game stats on it (#18). An enrollment
// still active isn't touched, so `returning` only brings the ones that actually entered the class
export const reactivateEndedEnrollment = {
  target: [enrollments.studentId, enrollments.classId],
  set: { endedAt: null },
  setWhere: isNotNull(enrollments.endedAt)
}

const insert = async (studentId: string, classId: string) => {
  const [enrollment] = await database
    .insert(enrollments)
    .values({ studentId, classId })
    .onConflictDoUpdate(reactivateEndedEnrollment)
    .returning()
  return enrollment
}

const listActiveClassesOf = async (studentId: string) =>
  database
    .select({
      id: classes.id,
      name: classes.name,
      description: classes.description
    })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        isNull(enrollments.endedAt),
        isNull(classes.archivedAt)
      )
    )

// `pending` is the same in every row of a user, so DISTINCT keeps one row per user
const listEnrolledStudents = async (classId: string) =>
  database
    .selectDistinct({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      xp: enrollments.xp,
      hp: enrollments.hp,
      coins: enrollments.coins,
      pending: sql<boolean>`${accounts.id} is null`
    })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .leftJoin(accounts, eq(accounts.userId, users.id))
    .where(and(eq(enrollments.classId, classId), isNull(enrollments.endedAt)))

const listActiveIds = async (classId: string, studentIds: string[]) => {
  const active = await database
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.classId, classId),
        inArray(enrollments.studentId, studentIds),
        isNull(enrollments.endedAt)
      )
    )
  return active.map(({ id }) => id)
}

// Without the `endedAt` filter: the history of a student who left the class stays readable
const findStudent = async (classId: string, studentId: string) => {
  const [student] = await database
    .select({ id: users.id, name: users.name })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .where(and(eq(enrollments.classId, classId), eq(users.id, studentId)))
  return student
}

const end = async (classId: string, studentId: string) => {
  const [enrollment] = await database
    .update(enrollments)
    .set({ endedAt: new Date() })
    .where(
      and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, studentId),
        isNull(enrollments.endedAt)
      )
    )
    .returning({ id: enrollments.id })
  return enrollment
}

// A single statement, so parallel requests can't all read the same count and pass the limit together
const recordJoinAttempt = async (
  studentId: string,
  { now, expiredSince }: { now: Date; expiredSince: Date }
) => {
  const isExpired = sql`${joinAttempts.windowStartedAt} <= ${expiredSince.toISOString()}::timestamptz`
  const [attempt] = await database
    .insert(joinAttempts)
    .values({ studentId, windowStartedAt: now, attempts: 1 })
    .onConflictDoUpdate({
      target: joinAttempts.studentId,
      set: {
        attempts: sql`case when ${isExpired} then 1 else ${joinAttempts.attempts} + 1 end`,
        windowStartedAt: sql`case when ${isExpired} then ${now.toISOString()}::timestamptz else ${joinAttempts.windowStartedAt} end`
      }
    })
    .returning()
  return attempt!
}

const forgiveJoinAttempt = async (studentId: string) =>
  database
    .update(joinAttempts)
    .set({ attempts: sql`greatest(${joinAttempts.attempts} - 1, 0)` })
    .where(eq(joinAttempts.studentId, studentId))

export const enrollmentRepo = {
  insert,
  listActiveClassesOf,
  listEnrolledStudents,
  listActiveIds,
  findStudent,
  end,
  recordJoinAttempt,
  forgiveJoinAttempt
}
