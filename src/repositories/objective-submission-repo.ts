import {
  and,
  type AnyColumn,
  asc,
  count,
  eq,
  exists,
  inArray,
  isNotNull,
  isNull,
  notExists,
  sql
} from 'drizzle-orm'

import { database } from '@/infra/database/client'
import {
  accounts,
  classes,
  enrollments,
  missions,
  objectives,
  objectiveSubmissions,
  users
} from '@/infra/database/schema'

import type { Transaction } from './ledger-repo'

export type SubmissionState = {
  objectiveIds: string[]
  submittedObjectiveIds: Set<string>
  hasOpenSubmission: boolean
}

const isPending = eq(objectiveSubmissions.status, 'pending')

const isOpen = inArray(objectiveSubmissions.status, ['pending', 'approved'])

const activeObjectiveOfClass = (classId: string) =>
  and(
    eq(missions.classId, classId),
    isNotNull(missions.publishedAt),
    isNull(missions.removedAt),
    isNull(objectives.removedAt)
  )

// A subquery, since a join would repeat the row for a user with two accounts
const studentPending = sql<boolean>`not exists (select 1 from ${accounts} where ${accounts.userId} = ${users.id})`

const openSubmissionOf = (
  enrollmentId: AnyColumn | string,
  objectiveId: string
) =>
  and(
    eq(objectiveSubmissions.enrollmentId, enrollmentId),
    eq(objectiveSubmissions.objectiveId, objectiveId),
    isOpen
  )

const hasOpenSubmission = async (
  transaction: Transaction,
  enrollmentId: string,
  objectiveId: string
) => {
  const rows = await transaction
    .select({ id: objectiveSubmissions.id })
    .from(objectiveSubmissions)
    .where(openSubmissionOf(enrollmentId, objectiveId))
    .limit(1)
  return rows.length > 0
}

// Under the lock the ledger takes on the enrollment, so a submission and the teacher's completion of
// the same objective never both go through. `check` may throw to cancel the transaction
const submit = async (
  studentId: string,
  classId: string,
  objectiveId: string,
  fields: { text: string; link: string | null },
  check: (state: SubmissionState) => void
) =>
  database.transaction(async (transaction) => {
    const [enrollment] = await transaction
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
      .for('update', { of: enrollments })
    if (!enrollment) return 'not_enrolled' as const

    const [objective] = await transaction
      .select({ missionId: objectives.missionId })
      .from(objectives)
      .innerJoin(missions, eq(missions.id, objectives.missionId))
      .where(
        and(eq(objectives.id, objectiveId), activeObjectiveOfClass(classId))
      )
    if (!objective) return 'objective_not_found' as const

    const missionObjectives = await transaction
      .select({ id: objectives.id })
      .from(objectives)
      .where(
        and(
          eq(objectives.missionId, objective.missionId),
          isNull(objectives.removedAt)
        )
      )
      .orderBy(asc(objectives.position))
    const objectiveIds = missionObjectives.map(({ id }) => id)
    const submitted = await transaction
      .selectDistinct({ objectiveId: objectiveSubmissions.objectiveId })
      .from(objectiveSubmissions)
      .where(
        and(
          eq(objectiveSubmissions.enrollmentId, enrollment.id),
          inArray(objectiveSubmissions.objectiveId, objectiveIds)
        )
      )
    check({
      objectiveIds,
      submittedObjectiveIds: new Set(submitted.map((row) => row.objectiveId)),
      hasOpenSubmission: await hasOpenSubmission(
        transaction,
        enrollment.id,
        objectiveId
      )
    })

    const [created] = await transaction
      .insert(objectiveSubmissions)
      .values({ enrollmentId: enrollment.id, objectiveId, ...fields })
      .returning({ id: objectiveSubmissions.id })
    return created!
  })

const activeEnrollmentOfSubmission = (classId: string) => {
  const enrollment = and(
    eq(enrollments.id, objectiveSubmissions.enrollmentId),
    eq(enrollments.classId, classId),
    isNull(enrollments.endedAt)
  )
  return exists(
    database.select({ id: enrollments.id }).from(enrollments).where(enrollment)
  )
}

// The objective and its mission aren't filtered: a submission sent before the teacher removed them
// still waits for a decision
const findPending = async (classId: string, submissionId: string) => {
  const [submission] = await database
    .select({
      id: objectiveSubmissions.id,
      enrollmentId: objectiveSubmissions.enrollmentId,
      submittedAt: objectiveSubmissions.createdAt,
      objectiveId: objectives.id,
      dueOn: objectives.dueOn,
      xpReward: objectives.xpReward,
      coinReward: objectives.coinReward,
      latePenaltyCoins: objectives.latePenaltyCoins,
      latePenaltyHp: objectives.latePenaltyHp
    })
    .from(objectiveSubmissions)
    .innerJoin(objectives, eq(objectives.id, objectiveSubmissions.objectiveId))
    .where(
      and(
        eq(objectiveSubmissions.id, submissionId),
        isPending,
        activeEnrollmentOfSubmission(classId)
      )
    )
  return submission
}

// Only a pending submission is settled, so a concurrent decision on the same one finds nothing here
// and the transaction around it is rolled back
const settle = async (
  classId: string,
  submissionId: string,
  fields:
    | { status: 'approved'; ledgerEntryId: string; decidedById: string }
    | { status: 'returned'; teacherComment: string; decidedById: string },
  transaction?: Transaction
) => {
  const [settled] = await (transaction ?? database)
    .update(objectiveSubmissions)
    .set({ ...fields, decidedAt: new Date() })
    .where(
      and(
        eq(objectiveSubmissions.id, submissionId),
        isPending,
        activeEnrollmentOfSubmission(classId)
      )
    )
    .returning({ id: objectiveSubmissions.id })
  return settled
}

// A completion has no text: the objective was done in class. Checked under the lock of the enrollment,
// so it never races a submission of the same objective
const insertCompleted = async (
  transaction: Transaction,
  fields: {
    enrollmentId: string
    objectiveId: string
    ledgerEntryId: string
    decidedById: string
  }
) => {
  if (
    await hasOpenSubmission(
      transaction,
      fields.enrollmentId,
      fields.objectiveId
    )
  ) {
    return false
  }
  await transaction
    .insert(objectiveSubmissions)
    .values({ ...fields, status: 'approved', decidedAt: new Date() })
  return true
}

// The reversal of the reward takes the approval back, so the student can send the objective again
const returnPaid = async (
  transaction: Transaction,
  ledgerEntryId: string,
  decidedById: string
) => {
  await transaction
    .update(objectiveSubmissions)
    .set({
      status: 'returned',
      teacherComment: null,
      decidedById,
      decidedAt: new Date()
    })
    .where(
      and(
        eq(objectiveSubmissions.ledgerEntryId, ledgerEntryId),
        eq(objectiveSubmissions.status, 'approved')
      )
    )
}

const pendingOfClass = (classId: string) =>
  and(isPending, eq(enrollments.classId, classId), isNull(enrollments.endedAt))

const listPendingOfClass = async (classId: string) =>
  database
    .select({
      id: objectiveSubmissions.id,
      text: objectiveSubmissions.text,
      link: objectiveSubmissions.link,
      submittedAt: objectiveSubmissions.createdAt,
      studentName: users.name,
      studentEmail: users.email,
      studentUsername: users.username,
      studentPending,
      missionName: missions.name,
      objectiveName: objectives.name,
      dueOn: objectives.dueOn,
      xpReward: objectives.xpReward,
      coinReward: objectives.coinReward,
      latePenaltyCoins: objectives.latePenaltyCoins,
      latePenaltyHp: objectives.latePenaltyHp
    })
    .from(objectiveSubmissions)
    .innerJoin(
      enrollments,
      eq(enrollments.id, objectiveSubmissions.enrollmentId)
    )
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .innerJoin(objectives, eq(objectives.id, objectiveSubmissions.objectiveId))
    .innerJoin(missions, eq(missions.id, objectives.missionId))
    .where(pendingOfClass(classId))
    .orderBy(asc(objectiveSubmissions.createdAt), asc(objectiveSubmissions.id))

const countPendingOfOwnedClass = async (teacherId: string, classId: string) => {
  const [result] = await database
    .select({ pending: count() })
    .from(objectiveSubmissions)
    .innerJoin(
      enrollments,
      eq(enrollments.id, objectiveSubmissions.enrollmentId)
    )
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(
      and(
        pendingOfClass(classId),
        eq(classes.teacherId, teacherId),
        isNull(classes.archivedAt)
      )
    )
  return result!.pending
}

const listCompletable = async (classId: string, objectiveId: string) => {
  const openSubmission = database
    .select({ id: objectiveSubmissions.id })
    .from(objectiveSubmissions)
    .where(openSubmissionOf(enrollments.id, objectiveId))
  return database
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      pending: studentPending
    })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .where(
      and(
        eq(enrollments.classId, classId),
        isNull(enrollments.endedAt),
        notExists(openSubmission)
      )
    )
    .orderBy(asc(users.name), asc(users.id))
}

export const objectiveSubmissionRepo = {
  submit,
  findPending,
  settle,
  insertCompleted,
  returnPaid,
  listPendingOfClass,
  countPendingOfOwnedClass,
  listCompletable
}
