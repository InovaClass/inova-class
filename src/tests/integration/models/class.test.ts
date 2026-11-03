import { eq } from 'drizzle-orm'
import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

import { database } from '@/infra/database/client'
import { classes, users } from '@/infra/database/schema'
import { NotFoundError } from '@/infra/errors'
import { generateJoinCode } from '@/models/class/join-code'
import { classModel } from '@/models/class/model'
import { orchestrator } from '@/tests/orchestrator'

vi.mock('@/models/class/join-code', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@/models/class/join-code')>()
  return { generateJoinCode: vi.fn(original.generateJoinCode) }
})

const newTeacherId = async () => {
  const { name, email } = orchestrator.newUser()
  const [teacher] = await database
    .insert(users)
    .values({ name, email, role: 'teacher' })
    .returning()
  return teacher!.id
}

const findStoredClass = async (classId: string) => {
  const [schoolClass] = await database
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
  return schoolClass
}

describe('classModel', () => {
  describe('create', () => {
    test('stores the class under its teacher', async () => {
      const teacherId = await newTeacherId()
      const input = orchestrator.newClass()

      const { id } = await classModel.create(teacherId, input)

      expect(await findStoredClass(id)).toMatchObject({
        ...input,
        teacherId,
        archivedAt: null
      })
    })

    test('stores a blank description as null', async () => {
      const teacherId = await newTeacherId()
      const { name } = orchestrator.newClass()

      const { description } = await classModel.create(teacherId, {
        name,
        description: ' '.repeat(3)
      })

      expect(description).toBeNull()
    })

    test('rejects a class without a name', async () => {
      const teacherId = await newTeacherId()

      await expect(
        classModel.create(teacherId, { name: '  ', description: '' })
      ).rejects.toBeInstanceOf(z.ZodError)
    })
  })

  describe('join code', () => {
    test('a new class starts with an enabled code of its own', async () => {
      const teacherId = await newTeacherId()

      const first = await classModel.create(teacherId, orchestrator.newClass())
      const second = await classModel.create(teacherId, orchestrator.newClass())

      expect(first.joinCodeEnabled).toBe(true)
      expect(first.joinCode).not.toBe(second.joinCode)
    })

    test('tries another code when the generated one is taken', async () => {
      const teacherId = await newTeacherId()
      const taken = await classModel.create(teacherId, orchestrator.newClass())
      vi.mocked(generateJoinCode).mockReturnValueOnce(taken.joinCode)

      const { joinCode } = await classModel.create(
        teacherId,
        orchestrator.newClass()
      )

      expect(joinCode).not.toBe(taken.joinCode)
    })

    test('regenerating replaces the code and keeps it disabled', async () => {
      const teacherId = await newTeacherId()
      const { id, joinCode } = await classModel.create(
        teacherId,
        orchestrator.newClass()
      )
      await classModel.setJoinCodeEnabled(teacherId, id, false)

      await classModel.regenerateJoinCode(teacherId, id)

      const stored = await findStoredClass(id)
      expect(stored?.joinCode).not.toBe(joinCode)
      expect(stored?.joinCodeEnabled).toBe(false)
    })

    test('rejects another teacher and an archived class', async () => {
      const teacherId = await newTeacherId()
      const otherTeacherId = await newTeacherId()
      const { id, joinCode } = await classModel.create(
        teacherId,
        orchestrator.newClass()
      )
      const archived = await classModel.create(
        teacherId,
        orchestrator.newClass()
      )
      await classModel.archive(teacherId, archived.id)

      await expect(
        classModel.regenerateJoinCode(otherTeacherId, id)
      ).rejects.toBeInstanceOf(NotFoundError)
      await expect(
        classModel.setJoinCodeEnabled(otherTeacherId, id, false)
      ).rejects.toBeInstanceOf(NotFoundError)
      await expect(
        classModel.regenerateJoinCode(teacherId, archived.id)
      ).rejects.toBeInstanceOf(NotFoundError)
      expect(await findStoredClass(id)).toMatchObject({
        joinCode,
        joinCodeEnabled: true
      })
    })
  })

  describe('list', () => {
    test('returns only the active classes of the teacher, newest first', async () => {
      const teacherId = await newTeacherId()
      const otherTeacherId = await newTeacherId()
      const oldest = await classModel.create(teacherId, orchestrator.newClass())
      const newest = await classModel.create(teacherId, orchestrator.newClass())
      const archived = await classModel.create(
        teacherId,
        orchestrator.newClass()
      )
      await classModel.archive(teacherId, archived.id)
      await classModel.create(otherTeacherId, orchestrator.newClass())

      const listed = await classModel.list(teacherId)

      expect(listed.map(({ id }) => id)).toEqual([newest.id, oldest.id])
    })
  })

  describe('findOwned', () => {
    test('returns the class to its teacher', async () => {
      const teacherId = await newTeacherId()
      const { id } = await classModel.create(teacherId, orchestrator.newClass())

      expect(await classModel.findOwned(teacherId, id)).toMatchObject({ id })
    })

    test('finds nothing for another teacher, an archived class or a malformed id', async () => {
      const teacherId = await newTeacherId()
      const otherTeacherId = await newTeacherId()
      const { id } = await classModel.create(teacherId, orchestrator.newClass())
      const archived = await classModel.create(
        teacherId,
        orchestrator.newClass()
      )
      await classModel.archive(teacherId, archived.id)

      expect(await classModel.findOwned(otherTeacherId, id)).toBeUndefined()
      expect(await classModel.findOwned(teacherId, archived.id)).toBeUndefined()
      expect(
        await classModel.findOwned(teacherId, 'not-a-uuid')
      ).toBeUndefined()
    })
  })

  describe('update', () => {
    test('changes the name and the description', async () => {
      const teacherId = await newTeacherId()
      const { id } = await classModel.create(teacherId, orchestrator.newClass())
      const input = orchestrator.newClass()

      await classModel.update(teacherId, id, input)

      expect(await findStoredClass(id)).toMatchObject(input)
    })

    test('rejects another teacher and leaves the class as it was', async () => {
      const teacherId = await newTeacherId()
      const otherTeacherId = await newTeacherId()
      const original = orchestrator.newClass()
      const { id } = await classModel.create(teacherId, original)

      await expect(
        classModel.update(otherTeacherId, id, orchestrator.newClass())
      ).rejects.toBeInstanceOf(NotFoundError)
      expect(await findStoredClass(id)).toMatchObject(original)
    })

    test('rejects an archived class', async () => {
      const teacherId = await newTeacherId()
      const { id } = await classModel.create(teacherId, orchestrator.newClass())
      await classModel.archive(teacherId, id)

      await expect(
        classModel.update(teacherId, id, orchestrator.newClass())
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('archive', () => {
    test('keeps the data of the class', async () => {
      const teacherId = await newTeacherId()
      const input = orchestrator.newClass()
      const { id } = await classModel.create(teacherId, input)

      await classModel.archive(teacherId, id)

      const stored = await findStoredClass(id)
      expect(stored).toMatchObject(input)
      expect(stored?.archivedAt).toBeInstanceOf(Date)
    })

    test('rejects another teacher and a malformed id', async () => {
      const teacherId = await newTeacherId()
      const otherTeacherId = await newTeacherId()
      const { id } = await classModel.create(teacherId, orchestrator.newClass())

      await expect(
        classModel.archive(otherTeacherId, id)
      ).rejects.toBeInstanceOf(NotFoundError)
      await expect(
        classModel.archive(teacherId, 'not-a-uuid')
      ).rejects.toBeInstanceOf(NotFoundError)
      expect(await findStoredClass(id)).toMatchObject({ archivedAt: null })
    })
  })
})
