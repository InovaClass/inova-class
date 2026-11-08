import { and, asc, eq, exists, isNull } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { classes, consequences } from '@/infra/database/schema'

export type ConsequenceFields = Pick<typeof consequences.$inferInsert, 'name'>

const consequenceColumns = {
  id: consequences.id,
  name: consequences.name
}

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

const activeConsequencesOf = (teacherId: string, classId: string) =>
  and(
    eq(consequences.classId, classId),
    isNull(consequences.removedAt),
    activeClassOf(teacherId, classId)
  )

const activeConsequenceOf = (
  teacherId: string,
  classId: string,
  consequenceId: string
) =>
  and(
    eq(consequences.id, consequenceId),
    activeConsequencesOf(teacherId, classId)
  )

// The default consequences of a class share their creation time, so they're listed by name
const listActive = async (teacherId: string, classId: string) =>
  database
    .select(consequenceColumns)
    .from(consequences)
    .where(activeConsequencesOf(teacherId, classId))
    .orderBy(asc(consequences.createdAt), asc(consequences.name))

const findActive = async (
  teacherId: string,
  classId: string,
  consequenceId: string
) => {
  const [consequence] = await database
    .select(consequenceColumns)
    .from(consequences)
    .where(activeConsequenceOf(teacherId, classId, consequenceId))
  return consequence
}

const insert = async (classId: string, fields: ConsequenceFields) => {
  const [consequence] = await database
    .insert(consequences)
    .values({ classId, ...fields })
    .returning(consequenceColumns)
  return consequence!
}

const updateActive = async (
  teacherId: string,
  classId: string,
  consequenceId: string,
  fields: ConsequenceFields
) => {
  const [consequence] = await database
    .update(consequences)
    .set(fields)
    .where(activeConsequenceOf(teacherId, classId, consequenceId))
    .returning(consequenceColumns)
  return consequence
}

const removeActive = async (
  teacherId: string,
  classId: string,
  consequenceId: string
) => {
  const [consequence] = await database
    .update(consequences)
    .set({ removedAt: new Date() })
    .where(activeConsequenceOf(teacherId, classId, consequenceId))
    .returning({ id: consequences.id })
  return consequence
}

export const consequenceRepo = {
  listActive,
  findActive,
  insert,
  updateActive,
  removeActive
}
