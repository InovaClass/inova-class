import { and, asc, count, eq, exists, isNull, max, sql } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { classes, missions, objectives } from '@/infra/database/schema'

import type { Transaction } from './ledger-repo'

export type MissionFields = Pick<
  typeof missions.$inferInsert,
  'name' | 'description' | 'map'
>

export type ObjectiveFields = Pick<
  typeof objectives.$inferInsert,
  | 'name'
  | 'story'
  | 'dueOn'
  | 'xpReward'
  | 'coinReward'
  | 'latePenaltyCoins'
  | 'latePenaltyHp'
  | 'discussionEnabled'
>

const isActiveObjective = isNull(objectives.removedAt)

const objectiveOfMission = and(
  eq(objectives.missionId, missions.id),
  isActiveObjective
)

const missionColumns = {
  id: missions.id,
  name: missions.name,
  description: missions.description,
  map: missions.map,
  publishedAt: missions.publishedAt,
  objectiveCount: count(objectives.id)
}

const objectiveFieldColumns = {
  name: objectives.name,
  story: objectives.story,
  dueOn: objectives.dueOn,
  xpReward: objectives.xpReward,
  coinReward: objectives.coinReward,
  latePenaltyCoins: objectives.latePenaltyCoins,
  latePenaltyHp: objectives.latePenaltyHp,
  discussionEnabled: objectives.discussionEnabled
}

const objectiveColumns = { id: objectives.id, ...objectiveFieldColumns }

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

const activeMissionsOf = (teacherId: string, classId: string) =>
  and(
    eq(missions.classId, classId),
    isNull(missions.removedAt),
    activeClassOf(teacherId, classId)
  )

const activeMissionOf = (
  teacherId: string,
  classId: string,
  missionId: string
) => and(eq(missions.id, missionId), activeMissionsOf(teacherId, classId))

const activeObjectivesOf = (missionId: string) =>
  and(eq(objectives.missionId, missionId), isActiveObjective)

const activeMission = (teacherId: string, classId: string, missionId: string) =>
  database
    .select({ id: missions.id })
    .from(missions)
    .where(activeMissionOf(teacherId, classId, missionId))

const activeObjectiveOf = (
  teacherId: string,
  classId: string,
  missionId: string,
  objectiveId: string
) =>
  and(
    eq(objectives.id, objectiveId),
    activeObjectivesOf(missionId),
    exists(activeMission(teacherId, classId, missionId))
  )

const listActive = async (teacherId: string, classId: string) =>
  database
    .select(missionColumns)
    .from(missions)
    .leftJoin(objectives, objectiveOfMission)
    .where(activeMissionsOf(teacherId, classId))
    .groupBy(missions.id)
    .orderBy(
      sql`${missions.publishedAt} is not null`,
      asc(missions.createdAt),
      asc(missions.name)
    )

const findActive = async (
  teacherId: string,
  classId: string,
  missionId: string
) => {
  const [mission] = await database
    .select(missionColumns)
    .from(missions)
    .leftJoin(objectives, objectiveOfMission)
    .where(activeMissionOf(teacherId, classId, missionId))
    .groupBy(missions.id)
  return mission
}

const insert = async (classId: string, fields: MissionFields) => {
  const [mission] = await database
    .insert(missions)
    .values({ classId, ...fields })
    .returning({ id: missions.id })
  return mission!
}

const updateActive = async (
  teacherId: string,
  classId: string,
  missionId: string,
  fields: Partial<MissionFields & { removedAt: Date }>
) => {
  const [mission] = await database
    .update(missions)
    .set(fields)
    .where(activeMissionOf(teacherId, classId, missionId))
    .returning({ id: missions.id })
  return mission
}

const removeActive = async (
  teacherId: string,
  classId: string,
  missionId: string
) => updateActive(teacherId, classId, missionId, { removedAt: new Date() })

type LockedMission = { id: string; publishedAt: Date | null }

// Every write that depends on the objectives of a mission (their order, their count) runs under
// this lock, so two of them never interleave. `work` gets `undefined` for a mission the teacher
// can't change, and may throw to cancel the transaction
const withLocked = async <Result>(
  teacherId: string,
  classId: string,
  missionId: string,
  work: (
    transaction: Transaction,
    mission: LockedMission | undefined
  ) => Promise<Result>
) =>
  database.transaction(async (transaction) => {
    const [mission] = await transaction
      .select({ id: missions.id, publishedAt: missions.publishedAt })
      .from(missions)
      .where(activeMissionOf(teacherId, classId, missionId))
      .for('update')
    return work(transaction, mission)
  })

const publish = async (transaction: Transaction, missionId: string) => {
  await transaction
    .update(missions)
    .set({ publishedAt: new Date() })
    .where(eq(missions.id, missionId))
}

// Locked for share, so the class isn't archived while a copy goes into it
const lockActiveClass = async (
  transaction: Transaction,
  teacherId: string,
  classId: string
) => {
  const [schoolClass] = await transaction
    .select({ id: classes.id })
    .from(classes)
    .where(
      and(
        eq(classes.id, classId),
        eq(classes.teacherId, teacherId),
        isNull(classes.archivedAt)
      )
    )
    .for('share')
  return schoolClass
}

// A copy, not a shared row, and without the submissions, so the edits and submissions of one class
// never touch the other (#98)
const copy = async (
  transaction: Transaction,
  missionId: string,
  targetClassId: string
) => {
  const [source] = await transaction
    .select({
      name: missions.name,
      description: missions.description,
      map: missions.map
    })
    .from(missions)
    .where(eq(missions.id, missionId))
  const [mission] = await transaction
    .insert(missions)
    .values({ classId: targetClassId, ...source! })
    .returning({ id: missions.id })
  const sourceObjectives = await transaction
    .select(objectiveFieldColumns)
    .from(objectives)
    .where(activeObjectivesOf(missionId))
    .orderBy(asc(objectives.position))
  if (sourceObjectives.length > 0) {
    await transaction.insert(objectives).values(
      sourceObjectives.map((fields, position) => ({
        missionId: mission!.id,
        position,
        ...fields
      }))
    )
  }
  return mission!
}

const listObjectives = async (
  teacherId: string,
  classId: string,
  missionId: string
) =>
  database
    .select(objectiveColumns)
    .from(objectives)
    .innerJoin(missions, eq(missions.id, objectives.missionId))
    .where(
      and(
        activeObjectivesOf(missionId),
        activeMissionOf(teacherId, classId, missionId)
      )
    )
    .orderBy(asc(objectives.position))

const listObjectiveIds = async (
  transaction: Transaction,
  missionId: string
) => {
  const rows = await transaction
    .select({ id: objectives.id })
    .from(objectives)
    .where(activeObjectivesOf(missionId))
    .orderBy(asc(objectives.position))
  return rows.map(({ id }) => id)
}

const findObjective = async (
  teacherId: string,
  classId: string,
  missionId: string,
  objectiveId: string
) => {
  const [objective] = await database
    .select(objectiveColumns)
    .from(objectives)
    .where(activeObjectiveOf(teacherId, classId, missionId, objectiveId))
  return objective
}

// Goes after the last active objective: a removed one keeps its old position, which a new one may
// repeat
const insertObjective = async (
  transaction: Transaction,
  missionId: string,
  fields: ObjectiveFields
) => {
  const [last] = await transaction
    .select({ position: max(objectives.position) })
    .from(objectives)
    .where(activeObjectivesOf(missionId))
  const [objective] = await transaction
    .insert(objectives)
    .values({ missionId, position: (last?.position ?? -1) + 1, ...fields })
    .returning({ id: objectives.id })
  return objective!
}

const updateObjective = async (
  teacherId: string,
  classId: string,
  missionId: string,
  objectiveId: string,
  fields: ObjectiveFields
) => {
  const [objective] = await database
    .update(objectives)
    .set(fields)
    .where(activeObjectiveOf(teacherId, classId, missionId, objectiveId))
    .returning({ id: objectives.id })
  return objective
}

const removeObjective = async (
  transaction: Transaction,
  missionId: string,
  objectiveId: string
) => {
  const [objective] = await transaction
    .update(objectives)
    .set({ removedAt: new Date() })
    .where(and(eq(objectives.id, objectiveId), activeObjectivesOf(missionId)))
    .returning({ id: objectives.id })
  return objective
}

const writeObjectiveOrder = async (
  transaction: Transaction,
  missionId: string,
  objectiveIds: string[]
) => {
  for (const [position, id] of objectiveIds.entries()) {
    await transaction
      .update(objectives)
      .set({ position })
      .where(and(eq(objectives.id, id), eq(objectives.missionId, missionId)))
  }
}

export const missionRepo = {
  listActive,
  findActive,
  insert,
  updateActive,
  removeActive,
  withLocked,
  publish,
  lockActiveClass,
  copy,
  listObjectives,
  listObjectiveIds,
  findObjective,
  insertObjective,
  updateObjective,
  removeObjective,
  writeObjectiveOrder
}
