import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import {
  accounts,
  enrollments,
  joinAttempts,
  users
} from '@/infra/database/schema'
import { NotFoundError } from '@/infra/errors'
import { classModel } from '@/models/class/model'
import {
  JOIN_ATTEMPTS_MAX,
  JOIN_ATTEMPTS_WINDOW_MINUTES
} from '@/models/enrollment/constants'
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

// 0 isn't in JOIN_CODE_ALPHABET, so no class ever has this code
const UNKNOWN_CODE = '000000'

const failJoinAttempts = async (studentId: string, times: number) => {
  for (let attempt = 0; attempt < times; attempt++) {
    await expect(
      enrollmentModel.join(studentId, { code: UNKNOWN_CODE })
    ).rejects.toMatchObject(invalidCode)
  }
}

const moveJoinWindowBack = async (studentId: string, minutes: number) =>
  database
    .update(joinAttempts)
    .set({ windowStartedAt: new Date(Date.now() - minutes * 60_000) })
    .where(eq(joinAttempts.studentId, studentId))

describe('enrollmentModel', () => {
  describe('join attempts', () => {
    test('rejects even a valid code past the limit and says when to try again', async () => {
      const { schoolClass } = await newClass()
      const studentId = await newUserId('student')
      await failJoinAttempts(studentId, JOIN_ATTEMPTS_MAX)

      await expect(
        enrollmentModel.join(studentId, { code: schoolClass.joinCode })
      ).rejects.toMatchObject({
        name: 'TooManyRequestsError',
        action: `Tente de novo em ${JOIN_ATTEMPTS_WINDOW_MINUTES} minutos.`
      })
      expect(await classIdsOf(studentId)).toEqual([])
    })

    test('uses the singular for the last minute', async () => {
      const studentId = await newUserId('student')
      await failJoinAttempts(studentId, JOIN_ATTEMPTS_MAX)
      await moveJoinWindowBack(studentId, JOIN_ATTEMPTS_WINDOW_MINUTES - 0.5)

      await expect(
        enrollmentModel.join(studentId, { code: UNKNOWN_CODE })
      ).rejects.toMatchObject({ action: 'Tente de novo em 1 minuto.' })
    })

    test('accepts attempts again once the window ends', async () => {
      const { schoolClass } = await newClass()
      const studentId = await newUserId('student')
      await failJoinAttempts(studentId, JOIN_ATTEMPTS_MAX)
      await moveJoinWindowBack(studentId, JOIN_ATTEMPTS_WINDOW_MINUTES)

      await enrollmentModel.join(studentId, { code: schoolClass.joinCode })

      expect(await classIdsOf(studentId)).toEqual([schoolClass.id])
    })

    test("doesn't count a valid code", async () => {
      const { schoolClass } = await newClass()
      const studentId = await newUserId('student')
      await failJoinAttempts(studentId, JOIN_ATTEMPTS_MAX - 1)

      await enrollmentModel.join(studentId, { code: schoolClass.joinCode })

      await failJoinAttempts(studentId, 1)
    })

    test("doesn't count a code of the wrong length", async () => {
      const studentId = await newUserId('student')
      await failJoinAttempts(studentId, JOIN_ATTEMPTS_MAX - 1)

      await expect(
        enrollmentModel.join(studentId, { code: 'A' })
      ).rejects.toMatchObject(invalidCode)

      await failJoinAttempts(studentId, 1)
    })

    test("doesn't let many parallel attempts pass the limit", async () => {
      const studentId = await newUserId('student')

      const results = await Promise.allSettled(
        Array.from({ length: JOIN_ATTEMPTS_MAX * 2 }, () =>
          enrollmentModel.join(studentId, { code: UNKNOWN_CODE })
        )
      )

      const blocked = results.filter(
        (result) =>
          result.status === 'rejected' &&
          result.reason.name === 'TooManyRequestsError'
      )
      expect(blocked).toHaveLength(JOIN_ATTEMPTS_MAX)
    })

    test("doesn't affect another student", async () => {
      const { schoolClass } = await newClass()
      await failJoinAttempts(await newUserId('student'), JOIN_ATTEMPTS_MAX)
      const studentId = await newUserId('student')

      await enrollmentModel.join(studentId, { code: schoolClass.joinCode })

      expect(await classIdsOf(studentId)).toEqual([schoolClass.id])
    })
  })

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

  describe('listClasses', () => {
    test('returns only the classes of the student, with their name and description', async () => {
      const { schoolClass } = await newClass()
      await newClass()
      const studentId = await enrollByCode(schoolClass.joinCode)

      expect(await enrollmentModel.listClasses(studentId)).toEqual([
        {
          id: schoolClass.id,
          name: schoolClass.name,
          description: schoolClass.description
        }
      ])
    })

    test('leaves out an archived class and an ended enrollment', async () => {
      const archived = await newClass()
      const ended = await newClass()
      const kept = await newClass()
      const studentId = await enrollByCode(archived.schoolClass.joinCode)
      await enrollmentModel.join(studentId, {
        code: ended.schoolClass.joinCode
      })
      await enrollmentModel.join(studentId, { code: kept.schoolClass.joinCode })

      await classModel.archive(archived.teacherId, archived.schoolClass.id)
      await enrollmentModel.remove(
        ended.teacherId,
        ended.schoolClass.id,
        studentId
      )

      const classes = await enrollmentModel.listClasses(studentId)
      expect(classes.map(({ id }) => id)).toEqual([kept.schoolClass.id])
    })

    test('sorts by name following pt-BR', async () => {
      const teacherId = await newUserId('teacher')
      const studentId = await newUserId('student')
      for (const name of ['Biologia', 'Zoologia', 'Álgebra']) {
        const { joinCode } = await classModel.create(teacherId, {
          ...orchestrator.newClass(),
          name
        })
        await enrollmentModel.join(studentId, { code: joinCode })
      }

      const classes = await enrollmentModel.listClasses(studentId)

      expect(classes.map(({ name }) => name)).toEqual([
        'Álgebra',
        'Biologia',
        'Zoologia'
      ])
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
