import { z } from 'zod'

import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { studentNotInClass } from '@/models/enrollment/errors'
import { itemsExclusiveToOthers } from '@/models/item/rules'
import { characterRepo } from '@/repositories/character-repo'

import {
  characterAlreadyChosen,
  characterClassChanged,
  characterNotChosen,
  enrollmentNotFound
} from './errors'
import { isOutfitColorOf, lookOf, outfitColorsOf } from './look'
import {
  type AppearanceInput,
  appearanceSchema,
  type CharacterClassInput,
  characterClassSchema,
  type CharacterInput,
  characterSchema,
  OUTFIT_COLOR_OF_ANOTHER_CHARACTER_CLASS
} from './schema'

// The ids come from the URL, and Postgres rejects a value that isn't a UUID instead of finding nothing
const isId = (id: string) => z.uuid().safeParse(id).success

const findOfStudent = async (studentId: string, classId: string) => {
  const enrollment = isId(classId)
    ? await characterRepo.findOfStudent(studentId, classId)
    : undefined
  if (!enrollment) return
  return { className: enrollment.className, look: lookOf(enrollment) }
}

const choose = async (
  studentId: string,
  classId: string,
  input: CharacterInput
) => {
  const fields = characterSchema.parse(input)
  const chosen = isId(classId)
    ? await characterRepo.choose(studentId, classId, fields)
    : undefined
  if (chosen) return
  const enrollment = await findOfStudent(studentId, classId)
  throw enrollment ? characterAlreadyChosen() : enrollmentNotFound()
}

const updateAppearance = async (
  studentId: string,
  classId: string,
  input: AppearanceInput
) => {
  const fields = appearanceSchema.parse(input)
  const enrollment = await findOfStudent(studentId, classId)
  if (!enrollment) throw enrollmentNotFound()
  const { look } = enrollment
  if (!look) throw characterNotChosen()
  if (!isOutfitColorOf(look.characterClass, fields.outfitColor)) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['outfitColor'],
        message: OUTFIT_COLOR_OF_ANOTHER_CHARACTER_CLASS,
        input: fields.outfitColor
      }
    ])
  }
  const updated = await characterRepo.updateAppearance(
    studentId,
    classId,
    look.characterClass,
    fields
  )
  if (!updated) {
    const current = await findOfStudent(studentId, classId)
    throw current ? characterClassChanged() : enrollmentNotFound()
  }
}

const changeCharacterClass = async (
  teacherId: string,
  classId: string,
  studentId: string,
  input: CharacterClassInput
) => {
  const { characterClass } = characterClassSchema.parse(input)
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  // A student who hasn't chosen yet has no character to change, and the roster offers none
  const changed = isId(studentId)
    ? await characterRepo.changeCharacterClass(schoolClass.id, studentId, {
        characterClass,
        firstOutfitColor: outfitColorsOf(characterClass)[0]!,
        removedItems: itemsExclusiveToOthers(characterClass)
      })
    : undefined
  if (!changed) throw studentNotInClass()
}

export const characterModel = {
  findOfStudent,
  choose,
  updateAppearance,
  changeCharacterClass
}
