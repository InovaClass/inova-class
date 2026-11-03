import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import { enrollments, users } from '@/infra/database/schema'
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
})
