import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import { accounts, enrollments, users } from '@/infra/database/schema'
import { NotFoundError } from '@/infra/errors'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'
import { orchestrator } from '@/tests/orchestrator'

const newUserId = async (role: UserRole) => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role })
    .returning()
  return user!.id
}

const newClass = async () => {
  const teacherId = await newUserId('teacher')
  const schoolClass = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  return { teacherId, schoolClass }
}

const classIdsOf = async (studentId: string) => {
  const rows = await database
    .select({ classId: enrollments.classId })
    .from(enrollments)
    .where(eq(enrollments.studentId, studentId))
  return rows.map(({ classId }) => classId)
}

const addAccount = async (userId: string, providerId: string) =>
  database
    .insert(accounts)
    .values({ userId, accountId: crypto.randomUUID(), providerId })

const nameOf = async (userId: string) => {
  const [user] = await database
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
  return user?.name
}

const enrollByCode = async (joinCode: string) => {
  const studentId = await newUserId('student')
  await enrollmentModel.join(studentId, { code: joinCode })
  return studentId
}

const invalidCode = {
  name: 'ZodError',
  issues: [expect.objectContaining({ path: ['code'] })]
}

describe('enrollmentModel', () => {
  describe('join', () => {
    test('enrolls the student and returns the name of the class', async () => {
      const { schoolClass } = await newClass()
      const studentId = await newUserId('student')

      const result = await enrollmentModel.join(studentId, {
        code: schoolClass.joinCode
      })

      expect(result).toEqual({
        className: schoolClass.name,
        alreadyEnrolled: false
      })
      expect(await classIdsOf(studentId)).toEqual([schoolClass.id])
    })

    test('accepts the code in lowercase and with spaces around it', async () => {
      const { schoolClass } = await newClass()
      const studentId = await newUserId('student')

      await enrollmentModel.join(studentId, {
        code: `  ${schoolClass.joinCode.toLowerCase()} `
      })

      expect(await classIdsOf(studentId)).toEqual([schoolClass.id])
    })

    test('enrolls a student in many classes', async () => {
      const first = await newClass()
      const second = await newClass()
      const studentId = await newUserId('student')

      await enrollmentModel.join(studentId, {
        code: first.schoolClass.joinCode
      })
      await enrollmentModel.join(studentId, {
        code: second.schoolClass.joinCode
      })

      expect(await classIdsOf(studentId)).toHaveLength(2)
    })

    test('joining twice keeps a single enrollment', async () => {
      const { schoolClass } = await newClass()
      const studentId = await newUserId('student')
      const input = { code: schoolClass.joinCode }

      await enrollmentModel.join(studentId, input)
      const result = await enrollmentModel.join(studentId, input)

      expect(result.alreadyEnrolled).toBe(true)
      expect(await classIdsOf(studentId)).toHaveLength(1)
    })

    test('rejects a disabled code, an old code and the code of an archived class', async () => {
      const disabled = await newClass()
      await classModel.setJoinCodeEnabled(
        disabled.teacherId,
        disabled.schoolClass.id,
        false
      )
      const regenerated = await newClass()
      await classModel.regenerateJoinCode(
        regenerated.teacherId,
        regenerated.schoolClass.id
      )
      const archived = await newClass()
      await classModel.archive(archived.teacherId, archived.schoolClass.id)
      const studentId = await newUserId('student')

      for (const { schoolClass } of [disabled, regenerated, archived]) {
        await expect(
          enrollmentModel.join(studentId, { code: schoolClass.joinCode })
        ).rejects.toMatchObject(invalidCode)
      }
      expect(await classIdsOf(studentId)).toEqual([])
    })
  })

  describe('listRoster', () => {
    test('shows the email of pending students only, once per student', async () => {
      const { teacherId, schoolClass } = await newClass()
      const pendingId = await enrollByCode(schoolClass.joinCode)
      const activeId = await enrollByCode(schoolClass.joinCode)
      await addAccount(activeId, 'credential')
      await addAccount(activeId, 'google')

      const roster = await enrollmentModel.listRoster(teacherId, schoolClass.id)

      expect(roster).toHaveLength(2)
      expect(roster.find(({ id }) => id === activeId)).toEqual({
        id: activeId,
        name: await nameOf(activeId),
        username: null,
        pending: false,
        email: undefined
      })
      expect(roster.find(({ id }) => id === pendingId)).toMatchObject({
        pending: true,
        email: expect.stringContaining('@example.com')
      })
    })

    test('sorts by name following pt-BR', async () => {
      const { teacherId, schoolClass } = await newClass()
      for (const name of ['Bruno', 'Zeca', 'Ágata']) {
        const studentId = await enrollByCode(schoolClass.joinCode)
        await database
          .update(users)
          .set({ name })
          .where(eq(users.id, studentId))
      }

      const roster = await enrollmentModel.listRoster(teacherId, schoolClass.id)

      expect(roster.map(({ name }) => name)).toEqual(['Ágata', 'Bruno', 'Zeca'])
    })

    test('rejects a class of another teacher', async () => {
      const { schoolClass } = await newClass()
      const other = await newClass()

      await expect(
        enrollmentModel.listRoster(other.teacherId, schoolClass.id)
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('remove', () => {
    test('takes the student out of the roster and keeps the account', async () => {
      const { teacherId, schoolClass } = await newClass()
      const studentId = await enrollByCode(schoolClass.joinCode)

      await enrollmentModel.remove(teacherId, schoolClass.id, studentId)

      expect(
        await enrollmentModel.listRoster(teacherId, schoolClass.id)
      ).toEqual([])
      expect(await nameOf(studentId)).toBeDefined()
    })

    test('leaves the other classes of the student alone', async () => {
      const first = await newClass()
      const second = await newClass()
      const studentId = await enrollByCode(first.schoolClass.joinCode)
      await enrollmentModel.join(studentId, {
        code: second.schoolClass.joinCode
      })

      await enrollmentModel.remove(
        first.teacherId,
        first.schoolClass.id,
        studentId
      )

      const roster = await enrollmentModel.listRoster(
        second.teacherId,
        second.schoolClass.id
      )
      expect(roster.map(({ id }) => id)).toEqual([studentId])
    })

    test('rejects a class of another teacher and keeps the enrollment', async () => {
      const { teacherId, schoolClass } = await newClass()
      const other = await newClass()
      const studentId = await enrollByCode(schoolClass.joinCode)

      await expect(
        enrollmentModel.remove(other.teacherId, schoolClass.id, studentId)
      ).rejects.toBeInstanceOf(NotFoundError)

      expect(
        await enrollmentModel.listRoster(teacherId, schoolClass.id)
      ).toHaveLength(1)
    })

    test('rejects a student out of the class, one already removed and a malformed id', async () => {
      const { teacherId, schoolClass } = await newClass()
      const removedId = await enrollByCode(schoolClass.joinCode)
      await enrollmentModel.remove(teacherId, schoolClass.id, removedId)
      const outsiderId = await newUserId('student')

      for (const studentId of [removedId, outsiderId, 'not-a-uuid']) {
        await expect(
          enrollmentModel.remove(teacherId, schoolClass.id, studentId)
        ).rejects.toBeInstanceOf(NotFoundError)
      }
    })

    test('a removed student comes back by code in the same enrollment', async () => {
      const { teacherId, schoolClass } = await newClass()
      const studentId = await enrollByCode(schoolClass.joinCode)
      const [before] = await database
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(eq(enrollments.studentId, studentId))
      await enrollmentModel.remove(teacherId, schoolClass.id, studentId)

      const result = await enrollmentModel.join(studentId, {
        code: schoolClass.joinCode
      })

      expect(result.alreadyEnrolled).toBe(false)
      const rows = await database
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(eq(enrollments.studentId, studentId))
      expect(rows).toEqual([before])
      expect(
        await enrollmentModel.listRoster(teacherId, schoolClass.id)
      ).toHaveLength(1)
    })
  })
})
