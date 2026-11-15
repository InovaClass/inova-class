import { and, eq, exists, isNotNull, isNull, sql } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { classes, enrollments } from '@/infra/database/schema'

export type AppearanceFields = Pick<
  typeof enrollments.$inferInsert,
  'bodyType' | 'skin' | 'hairStyle' | 'hairColor' | 'outfitColor'
>

export const characterColumns = {
  characterClass: enrollments.characterClass,
  bodyType: enrollments.bodyType,
  skin: enrollments.skin,
  hairStyle: enrollments.hairStyle,
  hairColor: enrollments.hairColor,
  outfitColor: enrollments.outfitColor,
  equippedItems: enrollments.equippedItems
}

const activeClass = (classId: string) =>
  database
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.id, classId), isNull(classes.archivedAt)))

const activeEnrollmentOf = (studentId: string, classId: string) =>
  and(
    eq(enrollments.studentId, studentId),
    eq(enrollments.classId, classId),
    isNull(enrollments.endedAt),
    exists(activeClass(classId))
  )

const findOfStudent = async (studentId: string, classId: string) => {
  const [enrollment] = await database
    .select({ className: classes.name, ...characterColumns })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(activeEnrollmentOf(studentId, classId))
  return enrollment
}

// Only while the character is empty, so two submits of the first choice never both go through
const choose = async (
  studentId: string,
  classId: string,
  fields: AppearanceFields & { characterClass: string }
) => {
  const [enrollment] = await database
    .update(enrollments)
    .set(fields)
    .where(
      and(
        activeEnrollmentOf(studentId, classId),
        isNull(enrollments.characterClass)
      )
    )
    .returning({ id: enrollments.id })
  return enrollment
}

// Only while the character class is the one the outfit color was checked against
const updateAppearance = async (
  studentId: string,
  classId: string,
  characterClass: string,
  fields: AppearanceFields
) => {
  const [enrollment] = await database
    .update(enrollments)
    .set(fields)
    .where(
      and(
        activeEnrollmentOf(studentId, classId),
        eq(enrollments.characterClass, characterClass)
      )
    )
    .returning({ id: enrollments.id })
  return enrollment
}

// The outfit colors belong to each character class, so a new one takes the first color of its class
const changeCharacterClass = async (
  classId: string,
  studentId: string,
  characterClass: string,
  firstOutfitColor: string
) => {
  const [enrollment] = await database
    .update(enrollments)
    .set({
      characterClass,
      outfitColor: sql`case when ${enrollments.characterClass} = ${characterClass} then ${enrollments.outfitColor} else ${firstOutfitColor} end`
    })
    .where(
      and(
        activeEnrollmentOf(studentId, classId),
        isNotNull(enrollments.characterClass)
      )
    )
    .returning({ id: enrollments.id })
  return enrollment
}

export const characterRepo = {
  findOfStudent,
  choose,
  updateAppearance,
  changeCharacterClass
}
