import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { accounts, enrollments, users } from '@/infra/database/schema'

// A student who comes back keeps the same enrollment, and the game stats on it (#18). An enrollment
// still active isn't touched, so `returning` only brings the ones that actually entered the class
export const reactivateEndedEnrollment = {
  target: [enrollments.studentId, enrollments.classId],
  set: { endedAt: null },
  setWhere: isNotNull(enrollments.endedAt)
}

export const enrollmentRepo = {
  insert: async (studentId: string, classId: string) => {
    const [enrollment] = await database
      .insert(enrollments)
      .values({ studentId, classId })
      .onConflictDoUpdate(reactivateEndedEnrollment)
      .returning()
    return enrollment
  },

  // `pending` is the same in every row of a user, so DISTINCT keeps one row per user
  listEnrolledStudents: async (classId: string) =>
    database
      .selectDistinct({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        pending: sql<boolean>`${accounts.id} is null`
      })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .leftJoin(accounts, eq(accounts.userId, users.id))
      .where(
        and(eq(enrollments.classId, classId), isNull(enrollments.endedAt))
      ),

  end: async (classId: string, studentId: string) => {
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
}
