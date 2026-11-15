import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import { enrollments, users } from '@/infra/database/schema'
import { NotFoundError, ValidationError } from '@/infra/errors'
import { characterModel } from '@/models/character/model'
import type { CharacterInput } from '@/models/character/schema'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'
import { orchestrator } from '@/tests/orchestrator'

const MAGE: CharacterInput = {
  characterClass: 'mage',
  bodyType: 'female',
  skin: 'olive',
  hairStyle: 'bob',
  hairColor: 'redhead',
  outfitColor: 'navy'
}

const newUserId = async (role: UserRole) => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role })
    .returning()
  return user!.id
}

const newScenario = async () => {
  const teacherId = await newUserId('teacher')
  const { id: classId } = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  const studentId = await newUserId('student')
  await database.insert(enrollments).values({ studentId, classId })
  return { teacherId, classId, studentId }
}

const newScenarioWithCharacter = async () => {
  const scenario = await newScenario()
  await characterModel.choose(scenario.studentId, scenario.classId, MAGE)
  return scenario
}

const storedLookOf = async (studentId: string, classId: string) => {
  const enrollment = await characterModel.findOfStudent(studentId, classId)
  return enrollment?.look
}

describe('characterModel', () => {
  describe('choose', () => {
    test('stores the character on the enrollment', async () => {
      const { classId, studentId } = await newScenario()

      expect(await storedLookOf(studentId, classId)).toBeNull()
      await characterModel.choose(studentId, classId, {
        ...MAGE,
        hairStyle: 'none'
      })

      expect(await storedLookOf(studentId, classId)).toEqual({
        ...MAGE,
        hairStyle: null,
        items: []
      })
    })

    test('rejects an outfit color of another character class', async () => {
      const { classId, studentId } = await newScenario()

      await expect(
        characterModel.choose(studentId, classId, {
          ...MAGE,
          outfitColor: 'steel'
        })
      ).rejects.toBeInstanceOf(z.ZodError)
      expect(await storedLookOf(studentId, classId)).toBeNull()
    })

    test('happens once per enrollment', async () => {
      const { classId, studentId } = await newScenarioWithCharacter()

      await expect(
        characterModel.choose(studentId, classId, {
          ...MAGE,
          characterClass: 'warrior',
          outfitColor: 'steel'
        })
      ).rejects.toBeInstanceOf(ValidationError)
      expect(await storedLookOf(studentId, classId)).toMatchObject({
        characterClass: 'mage'
      })
    })

    test('two simultaneous choices store only one', async () => {
      const { classId, studentId } = await newScenario()

      const results = await Promise.allSettled([
        characterModel.choose(studentId, classId, MAGE),
        characterModel.choose(studentId, classId, {
          ...MAGE,
          characterClass: 'healer',
          outfitColor: 'white'
        })
      ])

      expect(
        results.filter(({ status }) => status === 'fulfilled')
      ).toHaveLength(1)
    })

    test('rejects a class the student left, an archived one and a malformed id', async () => {
      const { teacherId, classId, studentId } = await newScenario()
      const archived = await newScenario()
      await classModel.archive(archived.teacherId, archived.classId)
      await enrollmentModel.remove(teacherId, classId, studentId)

      for (const [student, schoolClass] of [
        [studentId, classId],
        [archived.studentId, archived.classId],
        [studentId, 'not-a-uuid']
      ] as const) {
        await expect(
          characterModel.choose(student, schoolClass, MAGE)
        ).rejects.toBeInstanceOf(NotFoundError)
      }
    })
  })

  describe('updateAppearance', () => {
    test('changes the appearance and keeps the character class', async () => {
      const { classId, studentId } = await newScenarioWithCharacter()

      await characterModel.updateAppearance(studentId, classId, {
        bodyType: 'male',
        skin: 'black',
        hairStyle: 'afro',
        hairColor: 'blue',
        outfitColor: 'forest'
      })

      expect(await storedLookOf(studentId, classId)).toEqual({
        characterClass: 'mage',
        bodyType: 'male',
        skin: 'black',
        hairStyle: 'afro',
        hairColor: 'blue',
        outfitColor: 'forest',
        items: []
      })
    })

    test('ignores a character class sent along', async () => {
      const { classId, studentId } = await newScenarioWithCharacter()

      await characterModel.updateAppearance(studentId, classId, {
        ...MAGE,
        characterClass: 'warrior'
      } as CharacterInput)

      expect(await storedLookOf(studentId, classId)).toMatchObject({
        characterClass: 'mage'
      })
    })

    test('rejects an outfit color of another character class', async () => {
      const { classId, studentId } = await newScenarioWithCharacter()

      await expect(
        characterModel.updateAppearance(studentId, classId, {
          ...MAGE,
          outfitColor: 'gold'
        })
      ).rejects.toBeInstanceOf(z.ZodError)
    })

    test('rejects a student who has not chosen a character yet', async () => {
      const { classId, studentId } = await newScenario()

      await expect(
        characterModel.updateAppearance(studentId, classId, MAGE)
      ).rejects.toBeInstanceOf(ValidationError)
    })
  })

  describe('changeCharacterClass', () => {
    test('changes the character class and resets the outfit color', async () => {
      const { teacherId, classId, studentId } = await newScenarioWithCharacter()

      await characterModel.changeCharacterClass(teacherId, classId, studentId, {
        characterClass: 'healer'
      })

      expect(await storedLookOf(studentId, classId)).toEqual({
        ...MAGE,
        characterClass: 'healer',
        outfitColor: 'white',
        items: []
      })
    })

    test('keeps the outfit color when the character class is the same', async () => {
      const { teacherId, classId, studentId } = await newScenarioWithCharacter()

      await characterModel.changeCharacterClass(teacherId, classId, studentId, {
        characterClass: 'mage'
      })

      expect(await storedLookOf(studentId, classId)).toMatchObject({
        outfitColor: 'navy'
      })
    })

    test('the roster shows the new character', async () => {
      const { teacherId, classId, studentId } = await newScenarioWithCharacter()

      await characterModel.changeCharacterClass(teacherId, classId, studentId, {
        characterClass: 'warrior'
      })

      const [student] = await enrollmentModel.listRoster(teacherId, classId)
      expect(student?.look?.characterClass).toBe('warrior')
    })

    test('rejects another teacher, a student without a character and one who left', async () => {
      const withCharacter = await newScenarioWithCharacter()
      const withoutCharacter = await newScenario()
      const otherTeacherId = await newUserId('teacher')
      const input = { characterClass: 'warrior' } as const

      await expect(
        characterModel.changeCharacterClass(
          otherTeacherId,
          withCharacter.classId,
          withCharacter.studentId,
          input
        )
      ).rejects.toBeInstanceOf(NotFoundError)
      await expect(
        characterModel.changeCharacterClass(
          withoutCharacter.teacherId,
          withoutCharacter.classId,
          withoutCharacter.studentId,
          input
        )
      ).rejects.toBeInstanceOf(NotFoundError)
      await enrollmentModel.remove(
        withCharacter.teacherId,
        withCharacter.classId,
        withCharacter.studentId
      )
      await expect(
        characterModel.changeCharacterClass(
          withCharacter.teacherId,
          withCharacter.classId,
          withCharacter.studentId,
          input
        )
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })
})
