import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { behaviors, classes } from '@/infra/database/schema'

import type { BehaviorFields } from './behavior-repo'

type ClassDetails = { name: string; description: string | null }
type ClassChanges = Partial<
  ClassDetails & { joinCode: string; joinCodeEnabled: boolean }
>

const activeClassOf = (teacherId: string, classId: string) =>
  and(
    eq(classes.id, classId),
    eq(classes.teacherId, teacherId),
    isNull(classes.archivedAt)
  )

const listActive = async (teacherId: string) =>
  database
    .select()
    .from(classes)
    .where(and(eq(classes.teacherId, teacherId), isNull(classes.archivedAt)))
    .orderBy(desc(classes.createdAt))

const listArchived = async (teacherId: string) =>
  database
    .select({
      id: classes.id,
      name: classes.name,
      description: classes.description
    })
    .from(classes)
    .where(and(eq(classes.teacherId, teacherId), isNotNull(classes.archivedAt)))
    .orderBy(desc(classes.archivedAt))

const findActive = async (teacherId: string, classId: string) => {
  const [schoolClass] = await database
    .select()
    .from(classes)
    .where(activeClassOf(teacherId, classId))
  return schoolClass
}

const findJoinable = async (joinCode: string) => {
  const [schoolClass] = await database
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(
      and(
        eq(classes.joinCode, joinCode),
        eq(classes.joinCodeEnabled, true),
        isNull(classes.archivedAt)
      )
    )
  return schoolClass
}

// Archived classes count too, since the unique constraint on the column covers them
const isJoinCodeTaken = async (joinCode: string) => {
  const [schoolClass] = await database
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.joinCode, joinCode))
  return schoolClass !== undefined
}

const insert = async (
  teacherId: string,
  fields: ClassDetails & { joinCode: string },
  defaultBehaviors: BehaviorFields[]
) =>
  database.transaction(async (transaction) => {
    const [schoolClass] = await transaction
      .insert(classes)
      .values({ teacherId, ...fields })
      .returning()
    await transaction.insert(behaviors).values(
      defaultBehaviors.map((behavior) => ({
        ...behavior,
        classId: schoolClass!.id
      }))
    )
    return schoolClass!
  })

const updateActive = async (
  teacherId: string,
  classId: string,
  fields: ClassChanges
) => {
  const [schoolClass] = await database
    .update(classes)
    .set(fields)
    .where(activeClassOf(teacherId, classId))
    .returning()
  return schoolClass
}

const archiveActive = async (teacherId: string, classId: string) => {
  const [schoolClass] = await database
    .update(classes)
    .set({ archivedAt: new Date() })
    .where(activeClassOf(teacherId, classId))
    .returning()
  return schoolClass
}

const restoreArchived = async (teacherId: string, classId: string) => {
  const [schoolClass] = await database
    .update(classes)
    .set({ archivedAt: null })
    .where(
      and(
        eq(classes.id, classId),
        eq(classes.teacherId, teacherId),
        isNotNull(classes.archivedAt)
      )
    )
    .returning()
  return schoolClass
}

export const classRepo = {
  listActive,
  listArchived,
  findActive,
  findJoinable,
  isJoinCodeTaken,
  insert,
  updateActive,
  archiveActive,
  restoreArchived
}
