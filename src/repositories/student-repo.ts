import { and, eq, gt, inArray, isNull, like, or, sql } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import {
  accounts,
  enrollments,
  users,
  verifications
} from '@/infra/database/schema'

import { reactivateEndedEnrollment } from './enrollment-repo'

const INVITE_PREFIX = 'student-invite:'

type NewStudent = {
  id: string
  name: string
  email: string
  username: string
  createdById: string
}

type Invite = { studentId: string; token: string; expiresAt: Date }

type Enrollment = { studentId: string; classId: string }

const inviteIdentifier = (token: string) => `${INVITE_PREFIX}${token}`

const validInvite = (token: string) =>
  and(
    eq(verifications.identifier, inviteIdentifier(token)),
    gt(verifications.expiresAt, new Date())
  )

const invitesOf = (studentIds: string[]) =>
  and(
    like(verifications.identifier, `${INVITE_PREFIX}%`),
    inArray(verifications.value, studentIds)
  )

// Another request took an email or a username between the reads and the writes
class StudentConflictError extends Error {}

// `hasAccount` is the same in every row of a user, so DISTINCT keeps one row per user
const findByEmails = async (emails: string[]) =>
  database
    .selectDistinct({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
      hasAccount: sql<boolean>`${accounts.id} is not null`
    })
    .from(users)
    .leftJoin(accounts, eq(accounts.userId, users.id))
    .where(inArray(users.email, emails))

const findUsernamesStartingWith = async (prefixes: string[]) => {
  const rows = await database
    .select({ username: users.username })
    .from(users)
    .where(or(...prefixes.map((prefix) => like(users.username, `${prefix}%`))))
  return rows.flatMap(({ username }) => username ?? [])
}

// An invite replaces the previous one of the student, so only the latest email works
const saveInvites = async ({
  newStudents,
  enrollments: newEnrollments,
  invites
}: {
  newStudents: NewStudent[]
  enrollments: Enrollment[]
  invites: Invite[]
}) => {
  try {
    return await database.transaction(async (transaction) => {
      if (newStudents.length > 0) {
        const created = await transaction
          .insert(users)
          .values(
            newStudents.map((student) => ({
              ...student,
              displayUsername: student.username,
              role: 'student' as const
            }))
          )
          .onConflictDoNothing()
          .returning({ id: users.id })
        if (created.length !== newStudents.length) {
          throw new StudentConflictError()
        }
      }
      if (invites.length > 0) {
        const studentIds = invites.map(({ studentId }) => studentId)
        await transaction.delete(verifications).where(invitesOf(studentIds))
        await transaction.insert(verifications).values(
          invites.map(({ studentId, token, expiresAt }) => ({
            identifier: inviteIdentifier(token),
            value: studentId,
            expiresAt
          }))
        )
      }
      return newEnrollments.length > 0
        ? await transaction
            .insert(enrollments)
            .values(newEnrollments)
            .onConflictDoUpdate(reactivateEndedEnrollment)
            .returning({ studentId: enrollments.studentId })
        : []
    })
  } catch (error) {
    if (error instanceof StudentConflictError) return
    throw error
  }
}

const findInvite = async (token: string) => {
  const [invite] = await database
    .select({
      studentId: users.id,
      email: users.email,
      username: users.username
    })
    .from(verifications)
    .innerJoin(users, eq(verifications.value, sql`${users.id}::text`))
    .leftJoin(accounts, eq(accounts.userId, users.id))
    .where(and(validInvite(token), isNull(accounts.id)))
  return invite
}

// Deleting the invite first makes it single-use even with two requests at once
const activate = async (
  studentId: string,
  token: string,
  passwordHash: string
) =>
  database.transaction(async (transaction) => {
    const [invite] = await transaction
      .delete(verifications)
      .where(validInvite(token))
      .returning({ id: verifications.id })
    if (!invite) return false

    await transaction.insert(accounts).values({
      userId: studentId,
      accountId: studentId,
      providerId: 'credential',
      password: passwordHash
    })
    await transaction
      .update(users)
      .set({ emailVerified: true, termsAcceptedAt: new Date() })
      .where(eq(users.id, studentId))
    return true
  })

export const studentRepo = {
  findByEmails,
  findUsernamesStartingWith,
  saveInvites,
  findInvite,
  activate
}
