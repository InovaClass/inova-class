import { and, count, desc, eq, gte, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { database } from '@/infra/database/client'
import {
  classes,
  classMessages,
  enrollments,
  missions,
  objectives,
  users
} from '@/infra/database/schema'

import { activeEnrollmentOf, characterColumns } from './character-repo'
import { objectiveSubmissionRepo } from './objective-submission-repo'

type ObjectiveAccess = NonNullable<
  Awaited<ReturnType<typeof objectiveSubmissionRepo.objectiveAccessOf>>
>

// Empty for the class board, which never lists a message of a discussion
const ofThread = (objectiveId: string | null) =>
  objectiveId === null
    ? isNull(classMessages.objectiveId)
    : eq(classMessages.objectiveId, objectiveId)

const removers = alias(users, 'removers')

// Left join, since the teacher has no enrollment in the class: their messages come without avatar or mute
const list = async (
  classId: string,
  {
    objectiveId,
    includeRemoved,
    limit
  }: { objectiveId: string | null; includeRemoved: boolean; limit: number }
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
        ofThread(objectiveId),
        includeRemoved ? undefined : isNull(classMessages.removedAt)
      )
    )
    .orderBy(desc(classMessages.createdAt), desc(classMessages.id))
    .limit(limit)

const insert = async (
  classId: string,
  authorId: string,
  body: string,
  objectiveId: string | null
) => {
  const [message] = await database
    .insert(classMessages)
    .values({ classId, authorId, body, objectiveId })
    .returning({ id: classMessages.id })
  return message!
}

// The row lock makes the posts of one student wait for each other, so parallel requests can't all
// count the same messages and pass the limit together. The limit counts the board and the
// discussions together. `check` may throw to cancel the post
const insertForStudent = async (
  studentId: string,
  classId: string,
  body: string,
  {
    objectiveId,
    since,
    check
  }: {
    objectiveId: string | null
    since: Date
    check: (poster: {
      chatEnabled: boolean
      mutedAt: Date | null
      recentCount: number
      // Only for a discussion, undefined when the objective isn't an active one of a published mission of the class
      objective?: ObjectiveAccess
    }) => void
  }
) =>
  database.transaction(async (transaction) => {
    const [enrollment] = await transaction
      .select({
        id: enrollments.id,
        mutedAt: enrollments.chatMutedAt,
        chatEnabled: classes.chatEnabled
      })
      .from(enrollments)
      .innerJoin(classes, eq(classes.id, enrollments.classId))
      .where(activeEnrollmentOf(studentId, classId))
      .for('update', { of: enrollments })
    if (!enrollment) return

    const objective =
      objectiveId === null
        ? undefined
        : await objectiveSubmissionRepo.objectiveAccessOf(
            transaction,
            enrollment.id,
            classId,
            objectiveId
          )
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
    check({
      chatEnabled: enrollment.chatEnabled,
      mutedAt: enrollment.mutedAt,
      recentCount: recent!.total,
      objective
    })

    const [message] = await transaction
      .insert(classMessages)
      .values({ classId, authorId: studentId, body, objectiveId })
      .returning({ id: classMessages.id })
    return message!
  })

// For the teacher, who sees a draft's objectives too. The ownership of the class is checked before
const findObjectiveOfClass = async (classId: string, objectiveId: string) => {
  const [objective] = await database
    .select({ discussionEnabled: objectives.discussionEnabled })
    .from(objectives)
    .innerJoin(missions, eq(missions.id, objectives.missionId))
    .where(
      and(
        eq(objectives.id, objectiveId),
        eq(missions.classId, classId),
        isNull(missions.removedAt),
        isNull(objectives.removedAt)
      )
    )
  return objective
}

// What the student needs to reach the discussion of an objective, without the lock: only a post
// counts messages
const findStudentObjectiveAccess = async (
  studentId: string,
  classId: string,
  objectiveId: string
) =>
  database.transaction(async (transaction) => {
    const [enrollment] = await transaction
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(activeEnrollmentOf(studentId, classId))
    if (!enrollment) return
    return objectiveSubmissionRepo.objectiveAccessOf(
      transaction,
      enrollment.id,
      classId,
      objectiveId
    )
  })

const findInClass = async (classId: string, messageId: string) => {
  const [message] = await database
    .select({
      authorId: classMessages.authorId,
      objectiveId: classMessages.objectiveId,
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
  findObjectiveOfClass,
  findStudentObjectiveAccess,
  findInClass,
  markRemoved,
  setMuted,
  countByAuthor
}
