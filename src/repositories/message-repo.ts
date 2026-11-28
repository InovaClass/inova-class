import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { database } from '@/infra/database/client'
import {
  classes,
  classMessages,
  enrollments,
  users
} from '@/infra/database/schema'

import { activeEnrollmentOf, characterColumns } from './character-repo'

const removers = alias(users, 'removers')

// Left join, since the teacher has no enrollment in the class: their messages come without avatar or mute
const list = async (
  classId: string,
  { includeRemoved, limit }: { includeRemoved: boolean; limit: number }
) =>
  database
    .select({
      id: classMessages.id,
      body: classMessages.body,
      createdAt: classMessages.createdAt,
      authorId: classMessages.authorId,
      authorName: users.name,
      authorRole: users.role,
      authorEnrolled: sql<boolean>`${enrollments.id} is not null and ${enrollments.endedAt} is null`,
      authorMutedAt: enrollments.chatMutedAt,
      removedAt: classMessages.removedAt,
      removedByName: removers.name,
      ...characterColumns
    })
    .from(classMessages)
    .innerJoin(users, eq(users.id, classMessages.authorId))
    .leftJoin(
      enrollments,
      and(
        eq(enrollments.classId, classMessages.classId),
        eq(enrollments.studentId, classMessages.authorId)
      )
    )
    .leftJoin(removers, eq(removers.id, classMessages.removedById))
    .where(
      and(
        eq(classMessages.classId, classId),
        includeRemoved ? undefined : isNull(classMessages.removedAt)
      )
    )
    .orderBy(desc(classMessages.createdAt), desc(classMessages.id))
    .limit(limit)

const insert = async (classId: string, authorId: string, body: string) => {
  const [message] = await database
    .insert(classMessages)
    .values({ classId, authorId, body })
    .returning({ id: classMessages.id })
  return message!
}

// The row lock makes the posts of one student wait for each other, so parallel requests can't all
// count the same messages and pass the limit together. `check` may throw to cancel the post
const insertForStudent = async (
  studentId: string,
  classId: string,
  body: string,
  {
    since,
    check
  }: {
    since: Date
    check: (poster: {
      chatEnabled: boolean
      mutedAt: Date | null
      recentCount: number
    }) => void
  }
) =>
  database.transaction(async (transaction) => {
    const [enrollment] = await transaction
      .select({
        mutedAt: enrollments.chatMutedAt,
        chatEnabled: classes.chatEnabled
      })
      .from(enrollments)
      .innerJoin(classes, eq(classes.id, enrollments.classId))
      .where(activeEnrollmentOf(studentId, classId))
      .for('update', { of: enrollments })
    if (!enrollment) return

    const [recent] = await transaction
      .select({ total: count() })
      .from(classMessages)
      .where(
        and(
          eq(classMessages.classId, classId),
          eq(classMessages.authorId, studentId),
          gte(classMessages.createdAt, since)
        )
      )
    check({ ...enrollment, recentCount: recent!.total })

    const [message] = await transaction
      .insert(classMessages)
      .values({ classId, authorId: studentId, body })
      .returning({ id: classMessages.id })
    return message!
  })

const findInClass = async (classId: string, messageId: string) => {
  const [message] = await database
    .select({
      authorId: classMessages.authorId,
      removedAt: classMessages.removedAt
    })
    .from(classMessages)
    .where(
      and(eq(classMessages.id, messageId), eq(classMessages.classId, classId))
    )
  return message
}

const markRemoved = async (messageId: string, removedById: string) => {
  const [message] = await database
    .update(classMessages)
    .set({ removedAt: new Date(), removedById })
    .where(
      and(eq(classMessages.id, messageId), isNull(classMessages.removedAt))
    )
    .returning({ id: classMessages.id })
  return message
}

const setMuted = async (
  classId: string,
  studentId: string,
  mutedAt: Date | null
) => {
  const [enrollment] = await database
    .update(enrollments)
    .set({ chatMutedAt: mutedAt })
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

const countByAuthor = async (authorId: string) => {
  const [totals] = await database
    .select({ total: count() })
    .from(classMessages)
    .where(eq(classMessages.authorId, authorId))
  return totals!.total
}

export const messageRepo = {
  list,
  insert,
  insertForStudent,
  findInClass,
  markRemoved,
  setMuted,
  countByAuthor
}
