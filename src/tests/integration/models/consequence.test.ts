import { and, eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import { HP_MAX } from '@/constants/game'
import { database } from '@/infra/database/client'
import {
  consequences,
  enrollments,
  ledgerEntries,
  users
} from '@/infra/database/schema'
import { NotFoundError, ValidationError } from '@/infra/errors'
import { classModel } from '@/models/class/model'
import { DEFAULT_CONSEQUENCES } from '@/models/consequence/constants'
import { consequenceModel } from '@/models/consequence/model'
import { orchestrator } from '@/tests/orchestrator'

const newTeacherId = async () => {
  const { name, email } = orchestrator.newUser()
  const [teacher] = await database
    .insert(users)
    .values({ name, email, role: 'teacher' })
    .returning()
  return teacher!.id
}

const newScenario = async ({ hp = 0 } = {}) => {
  const teacherId = await newTeacherId()
  const { id: classId } = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  const { name, email } = orchestrator.newUser()
  const [student] = await database
    .insert(users)
    .values({ name, email, role: 'student' })
    .returning()
  const studentId = student!.id
  const [enrollment] = await database
    .insert(enrollments)
    .values({ studentId, classId, hp })
    .returning()
  return { teacherId, classId, studentId, enrollmentId: enrollment!.id }
}

const hpOf = async (enrollmentId: string) => {
  const [enrollment] = await database
    .select({ hp: enrollments.hp })
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
  return enrollment!.hp
}

const restoresOf = async (enrollmentId: string) =>
  database
    .select()
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.enrollmentId, enrollmentId),
        eq(ledgerEntries.type, 'hp_restore')
      )
    )

describe('consequenceModel', () => {
  test('a new class starts with the default consequences', async () => {
    const { teacherId, classId } = await newScenario()

    const listed = await consequenceModel.list(teacherId, classId)

    expect(
      listed.map(({ name }) => name).toSorted((a, b) => a.localeCompare(b))
    ).toEqual(
      DEFAULT_CONSEQUENCES.map(({ name }) => name).toSorted((a, b) =>
        a.localeCompare(b)
      )
    )
  })

  test('a removed consequence leaves the list and keeps its row', async () => {
    const { teacherId, classId } = await newScenario()
    const { id } = await consequenceModel.create(teacherId, classId, {
      name: 'Consequência removida'
    })

    await consequenceModel.remove(teacherId, classId, id)

    expect(await consequenceModel.findOwned(teacherId, classId, id)).toBe(
      undefined
    )
    const rows = await database
      .select()
      .from(consequences)
      .where(eq(consequences.id, id))
    expect(rows).toHaveLength(1)
  })

  test("another teacher can't change a consequence", async () => {
    const { teacherId, classId } = await newScenario()
    const { id } = await consequenceModel.create(teacherId, classId, {
      name: 'Consequência da turma'
    })
    const otherTeacherId = await newTeacherId()

    await expect(
      consequenceModel.update(otherTeacherId, classId, id, { name: 'Outra' })
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(
      consequenceModel.remove(otherTeacherId, classId, id)
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  describe('draw', () => {
    test('restores the HP and records the consequence drawn', async () => {
      const { teacherId, classId, studentId, enrollmentId } =
        await newScenario()

      const drawn = await consequenceModel.draw(teacherId, classId, studentId)

      expect(await hpOf(enrollmentId)).toBe(HP_MAX)
      expect(await restoresOf(enrollmentId)).toMatchObject([
        { hpDelta: HP_MAX, sourceId: drawn.id, createdById: teacherId }
      ])
    })

    test('refuses a student who still has HP', async () => {
      const { teacherId, classId, studentId, enrollmentId } = await newScenario(
        { hp: 1 }
      )

      await expect(
        consequenceModel.draw(teacherId, classId, studentId)
      ).rejects.toBeInstanceOf(ValidationError)
      expect(await hpOf(enrollmentId)).toBe(1)
    })

    test('concurrent draws restore the HP only once', async () => {
      const { teacherId, classId, studentId, enrollmentId } =
        await newScenario()

      const results = await Promise.allSettled([
        consequenceModel.draw(teacherId, classId, studentId),
        consequenceModel.draw(teacherId, classId, studentId)
      ])

      expect(
        results
          .map(({ status }) => status)
          .toSorted((a, b) => a.localeCompare(b))
      ).toEqual(['fulfilled', 'rejected'])
      expect(await restoresOf(enrollmentId)).toHaveLength(1)
    })

    test('keeps the student without HP when there is nothing to draw', async () => {
      const { teacherId, classId, studentId, enrollmentId } =
        await newScenario()
      const listed = await consequenceModel.list(teacherId, classId)
      for (const { id } of listed) {
        await consequenceModel.remove(teacherId, classId, id)
      }

      await expect(
        consequenceModel.draw(teacherId, classId, studentId)
      ).rejects.toBeInstanceOf(ValidationError)
      expect(await hpOf(enrollmentId)).toBe(0)
    })

    test('refuses a student of another class', async () => {
      const { teacherId, classId } = await newScenario()
      const { studentId } = await newScenario()

      await expect(
        consequenceModel.draw(teacherId, classId, studentId)
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    test("another teacher can't draw", async () => {
      const { classId, studentId } = await newScenario()
      const otherTeacherId = await newTeacherId()

      await expect(
        consequenceModel.draw(otherTeacherId, classId, studentId)
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
