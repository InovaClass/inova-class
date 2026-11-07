import { and, asc, eq, exists, isNull } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { behaviors, classes } from '@/infra/database/schema'

export type BehaviorFields = Pick<
  typeof behaviors.$inferInsert,
  'name' | 'xp' | 'hp' | 'coins'
>

const behaviorColumns = {
  id: behaviors.id,
  name: behaviors.name,
  xp: behaviors.xp,
  hp: behaviors.hp,
  coins: behaviors.coins
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

const activeBehaviorsOf = (teacherId: string, classId: string) =>
  and(
    eq(behaviors.classId, classId),
    isNull(behaviors.removedAt),
    activeClassOf(teacherId, classId)
  )

const activeBehaviorOf = (
  teacherId: string,
  classId: string,
  behaviorId: string
) => and(eq(behaviors.id, behaviorId), activeBehaviorsOf(teacherId, classId))

// The default behaviors of a class share their creation time, so they're listed by name
const listActive = async (teacherId: string, classId: string) =>
  database
    .select(behaviorColumns)
    .from(behaviors)
    .where(activeBehaviorsOf(teacherId, classId))
    .orderBy(asc(behaviors.createdAt), asc(behaviors.name))

const findActive = async (
  teacherId: string,
  classId: string,
  behaviorId: string
) => {
  const [behavior] = await database
    .select(behaviorColumns)
    .from(behaviors)
    .where(activeBehaviorOf(teacherId, classId, behaviorId))
  return behavior
}

const insert = async (classId: string, fields: BehaviorFields) => {
  const [behavior] = await database
    .insert(behaviors)
    .values({ classId, ...fields })
    .returning(behaviorColumns)
  return behavior!
}

const updateActive = async (
  teacherId: string,
  classId: string,
  behaviorId: string,
  fields: BehaviorFields
) => {
  const [behavior] = await database
    .update(behaviors)
    .set(fields)
    .where(activeBehaviorOf(teacherId, classId, behaviorId))
    .returning(behaviorColumns)
  return behavior
}

const removeActive = async (
  teacherId: string,
  classId: string,
  behaviorId: string
) => {
  const [behavior] = await database
    .update(behaviors)
    .set({ removedAt: new Date() })
    .where(activeBehaviorOf(teacherId, classId, behaviorId))
    .returning({ id: behaviors.id })
  return behavior
}

export const behaviorRepo = {
  listActive,
  findActive,
  insert,
  updateActive,
  removeActive
}
