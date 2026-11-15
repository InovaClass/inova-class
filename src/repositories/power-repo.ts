import { and, asc, eq, exists, isNull } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { classes, enrollments, powers } from '@/infra/database/schema'

export type PowerFields = Pick<
  typeof powers.$inferInsert,
  'characterClass' | 'name' | 'description' | 'cost' | 'minLevel'
>

const powerColumns = {
  id: powers.id,
  characterClass: powers.characterClass,
  name: powers.name,
  description: powers.description,
  cost: powers.cost,
  minLevel: powers.minLevel,
  disabledAt: powers.disabledAt
}

const powerOrder = [asc(powers.minLevel), asc(powers.cost), asc(powers.name)]

const activeClassOf = (teacherId: string, classId: string) => {
  const ownedClass = and(
    eq(classes.id, classId),
    eq(classes.teacherId, teacherId),
    isNull(classes.archivedAt)
  )
  return exists(
    database.select({ id: classes.id }).from(classes).where(ownedClass)
  )
}

const activePowersOf = (teacherId: string, classId: string) =>
  and(
    eq(powers.classId, classId),
    isNull(powers.removedAt),
    activeClassOf(teacherId, classId)
  )

const activePowerOf = (teacherId: string, classId: string, powerId: string) =>
  and(eq(powers.id, powerId), activePowersOf(teacherId, classId))

const listActive = async (teacherId: string, classId: string) =>
  database
    .select(powerColumns)
    .from(powers)
    .where(activePowersOf(teacherId, classId))
    .orderBy(...powerOrder)

// Joined on the enrollment, so a student without a character, one who left and an archived class
// all get no rows
const listEnabledOfStudent = async (studentId: string, classId: string) =>
  database
    .select({ ...powerColumns, xp: enrollments.xp })
    .from(powers)
    .innerJoin(
      enrollments,
      and(
        eq(enrollments.classId, powers.classId),
        eq(enrollments.characterClass, powers.characterClass)
      )
    )
    .innerJoin(classes, eq(classes.id, powers.classId))
    .where(
      and(
        eq(powers.classId, classId),
        isNull(powers.removedAt),
        isNull(powers.disabledAt),
        eq(enrollments.studentId, studentId),
        isNull(enrollments.endedAt),
        isNull(classes.archivedAt)
      )
    )
    .orderBy(...powerOrder)

const findActive = async (
  teacherId: string,
  classId: string,
  powerId: string
) => {
  const [power] = await database
    .select(powerColumns)
    .from(powers)
    .where(activePowerOf(teacherId, classId, powerId))
  return power
}

const insert = async (classId: string, fields: PowerFields) => {
  const [power] = await database
    .insert(powers)
    .values({ classId, ...fields })
    .returning(powerColumns)
  return power!
}

const updateActive = async (
  teacherId: string,
  classId: string,
  powerId: string,
  fields: Partial<PowerFields & { disabledAt: Date | null }>
) => {
  const [power] = await database
    .update(powers)
    .set(fields)
    .where(activePowerOf(teacherId, classId, powerId))
    .returning(powerColumns)
  return power
}

const removeActive = async (
  teacherId: string,
  classId: string,
  powerId: string
) => {
  const [power] = await database
    .update(powers)
    .set({ removedAt: new Date() })
    .where(activePowerOf(teacherId, classId, powerId))
    .returning({ id: powers.id })
  return power
}

export const powerRepo = {
  listActive,
  listEnabledOfStudent,
  findActive,
  insert,
  updateActive,
  removeActive
}
