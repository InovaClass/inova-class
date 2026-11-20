import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import type { UserRole } from '@/constants/user'
import { auth } from '@/infra/auth'
import { database } from '@/infra/database/client'
import {
  accounts,
  classes,
  enrollments,
  rewards,
  sessions,
  users,
  verificationResends,
  verifications
} from '@/infra/database/schema'
import { UnauthorizedError, ValidationError } from '@/infra/errors'
import { accountModel } from '@/models/account/model'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'
import { rewardModel } from '@/models/reward/model'
import { rewardOrderModel } from '@/models/reward-order/model'
import { orchestrator } from '@/tests/orchestrator'

const host = { host: 'localhost:3000' }

type NewUser = { role: UserRole; createdById?: string }

// An account no one signs in to: a pending student, or a user whose password the test doesn't need
const newUser = async ({ role, createdById }: NewUser) => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role, createdById })
    .returning()
  return user!
}

// Signed in through Better Auth, so the deletion finds the session it checks
const newSignedInUser = async ({ role }: { role: UserRole }) => {
  const { name, email, password } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role, emailVerified: true })
    .returning()
  const context = await auth.$context
  await database.insert(accounts).values({
    userId: user!.id,
    accountId: user!.id,
    providerId: 'credential',
    password: await context.password.hash(password)
  })
  const { headers: response } = await auth.api.signInEmail({
    body: { email, password },
    headers: new Headers(host),
    returnHeaders: true
  })
  const cookie = response
    .getSetCookie()
    .map((value) => value.split(';', 1)[0])
    .join('; ')
  return { user: user!, password, headers: new Headers({ ...host, cookie }) }
}

const newClassOf = async (teacherId: string) =>
  classModel.create(teacherId, orchestrator.newClass())

const enroll = async (studentId: string, classId: string, coins = 0) => {
  const [enrollment] = await database
    .insert(enrollments)
    .values({ studentId, classId, coins })
    .returning()
  return enrollment!
}

const userExists = async (id: string) => {
  const [user] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
  return user !== undefined
}

const stockOf = async (rewardId: string) => {
  const [reward] = await database
    .select({ stock: rewards.stock })
    .from(rewards)
    .where(eq(rewards.id, rewardId))
  return reward!.stock
}

const removePassword = async (userId: string) =>
  database.delete(accounts).where(eq(accounts.userId, userId))

const newStudentScenario = async () => {
  const teacher = await newUser({ role: 'teacher' })
  const schoolClass = await newClassOf(teacher.id)
  const student = await newUser({
    role: 'student',
    createdById: teacher.id
  })
  await enroll(student.id, schoolClass.id)
  return { teacher, schoolClass, student }
}

describe('accountModel', () => {
  describe('deleteOwn', () => {
    test('deletes a student who confirms with the password, along with the enrollments and the sessions', async () => {
      const teacher = await newUser({ role: 'teacher' })
      const schoolClass = await newClassOf(teacher.id)
      const { user, password, headers } = await newSignedInUser({
        role: 'student'
      })
      await enroll(user.id, schoolClass.id)

      await accountModel.deleteOwn(user, { password }, { headers })

      expect(await userExists(user.id)).toBe(false)
      const left = await database
        .select()
        .from(enrollments)
        .where(eq(enrollments.studentId, user.id))
      expect(left).toEqual([])
      const sessionsLeft = await database
        .select()
        .from(sessions)
        .where(eq(sessions.userId, user.id))
      expect(sessionsLeft).toEqual([])
    })

    test('keeps the account when the password is wrong', async () => {
      const { user, headers } = await newSignedInUser({ role: 'student' })

      const attempt = accountModel.deleteOwn(
        user,
        { password: orchestrator.newPassword() },
        { headers }
      )

      await expect(attempt).rejects.toBeInstanceOf(z.ZodError)
      expect(await userExists(user.id)).toBe(true)
    })

    test('puts the unit of a pending order back in stock', async () => {
      const teacher = await newUser({ role: 'teacher' })
      const schoolClass = await newClassOf(teacher.id)
      const { user, password, headers } = await newSignedInUser({
        role: 'student'
      })
      await enroll(user.id, schoolClass.id, 50)
      const reward = await rewardModel.create(teacher.id, schoolClass.id, {
        name: 'Recompensa da turma',
        description: '',
        price: '20',
        stock: '2'
      })
      await rewardOrderModel.purchase(user.id, schoolClass.id, reward.id)

      await accountModel.deleteOwn(user, { password }, { headers })

      expect(await stockOf(reward.id)).toBe(2)
    })

    test('deletes the invites and the resend cooldown that point to the account', async () => {
      const { user, password, headers } = await newSignedInUser({
        role: 'student'
      })
      await database.insert(verifications).values({
        identifier: `student-invite:${crypto.randomUUID()}`,
        value: user.id,
        expiresAt: new Date(Date.now() + 60_000)
      })
      await database
        .insert(verificationResends)
        .values({ identifier: user.email, sentAt: new Date() })

      await accountModel.deleteOwn(user, { password }, { headers })

      const invites = await database
        .select()
        .from(verifications)
        .where(eq(verifications.value, user.id))
      expect(invites).toEqual([])
      const resends = await database
        .select()
        .from(verificationResends)
        .where(eq(verificationResends.identifier, user.email))
      expect(resends).toEqual([])
    })

    test('deletes an account without a password while the session is recent', async () => {
      const { user, headers } = await newSignedInUser({ role: 'teacher' })
      await removePassword(user.id)

      await accountModel.deleteOwn(user, {}, { headers })

      expect(await userExists(user.id)).toBe(false)
    })

    test('asks an account without a password to sign in again when the session is old', async () => {
      const { user, headers } = await newSignedInUser({ role: 'teacher' })
      await removePassword(user.id)
      await database
        .update(sessions)
        .set({ createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) })
        .where(eq(sessions.userId, user.id))

      const attempt = accountModel.deleteOwn(user, {}, { headers })

      await expect(attempt).rejects.toBeInstanceOf(UnauthorizedError)
      expect(await userExists(user.id)).toBe(true)
    })

    test("deletes a teacher's classes and the pending students only in them", async () => {
      const { user, password, headers } = await newSignedInUser({
        role: 'teacher'
      })
      const schoolClass = await newClassOf(user.id)
      const otherTeacher = await newUser({ role: 'teacher' })
      const otherClass = await newClassOf(otherTeacher.id)
      const pendingHere = await newUser({
        role: 'student',
        createdById: user.id
      })
      const pendingElsewhere = await newUser({
        role: 'student',
        createdById: user.id
      })
      const joinedByCode = await newUser({ role: 'student' })
      await enroll(pendingHere.id, schoolClass.id)
      await enroll(pendingElsewhere.id, schoolClass.id)
      await enroll(pendingElsewhere.id, otherClass.id)
      await enroll(joinedByCode.id, schoolClass.id)

      await accountModel.deleteOwn(user, { password }, { headers })

      const classesLeft = await database
        .select()
        .from(classes)
        .where(eq(classes.teacherId, user.id))
      expect(classesLeft).toEqual([])
      expect(await userExists(pendingHere.id)).toBe(false)
      expect(await userExists(pendingElsewhere.id)).toBe(true)
      expect(await userExists(joinedByCode.id)).toBe(true)
    })
  })

  describe('deleteInvitedStudent', () => {
    test('deletes a student the teacher invited who is only in their classes', async () => {
      const { teacher, schoolClass, student } = await newStudentScenario()
      const secondClass = await newClassOf(teacher.id)
      await enroll(student.id, secondClass.id)

      await accountModel.deleteInvitedStudent(
        teacher.id,
        schoolClass.id,
        student.id
      )

      expect(await userExists(student.id)).toBe(false)
    })

    test("refuses a student who was ever in another teacher's class", async () => {
      const { teacher, schoolClass, student } = await newStudentScenario()
      const otherTeacher = await newUser({ role: 'teacher' })
      const otherClass = await newClassOf(otherTeacher.id)
      await enroll(student.id, otherClass.id)
      await enrollmentModel.remove(otherTeacher.id, otherClass.id, student.id)

      const attempt = accountModel.deleteInvitedStudent(
        teacher.id,
        schoolClass.id,
        student.id
      )

      await expect(attempt).rejects.toBeInstanceOf(ValidationError)
      expect(await userExists(student.id)).toBe(true)
    })

    test('refuses a student the teacher did not invite', async () => {
      const { teacher, schoolClass } = await newStudentScenario()
      const joinedByCode = await newUser({ role: 'student' })
      await enroll(joinedByCode.id, schoolClass.id)

      const attempt = accountModel.deleteInvitedStudent(
        teacher.id,
        schoolClass.id,
        joinedByCode.id
      )

      await expect(attempt).rejects.toBeInstanceOf(ValidationError)
      expect(await userExists(joinedByCode.id)).toBe(true)
    })

    test('refuses a student who left the class', async () => {
      const { teacher, schoolClass, student } = await newStudentScenario()
      await enrollmentModel.remove(teacher.id, schoolClass.id, student.id)

      const attempt = accountModel.deleteInvitedStudent(
        teacher.id,
        schoolClass.id,
        student.id
      )

      await expect(attempt).rejects.toBeInstanceOf(ValidationError)
    })
  })
})
