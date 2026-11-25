import { z } from 'zod'

import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { missionRepo } from '@/repositories/mission-repo'

import {
  lastObjectiveOfPublishedMission,
  missionAlreadyPublished,
  missionNotFound,
  missionWithoutObjectives,
  objectiveNotFound
} from './errors'
import { mapIdOf } from './maps'
import { moveItem } from './order'
import {
  type MissionInput,
  missionSchema,
  moveDirectionSchema,
  type ObjectiveInput,
  objectiveSchema
} from './schema'

// The ids come from the URL, and Postgres rejects a value that isn't a UUID instead of finding nothing
const isId = (id: string) => z.uuid().safeParse(id).success

type MissionRow = NonNullable<
  Awaited<ReturnType<typeof missionRepo.findActive>>
>

const missionOf = ({ publishedAt, map, ...mission }: MissionRow) => ({
  ...mission,
  map: mapIdOf(map),
  published: publishedAt !== null
})

const list = async (teacherId: string, classId: string) => {
  const missions = isId(classId)
    ? await missionRepo.listActive(teacherId, classId)
    : []
  return missions.map((mission) => missionOf(mission))
}

const findOwned = async (
  teacherId: string,
  classId: string,
  missionId: string
) => {
  const mission =
    isId(classId) && isId(missionId)
      ? await missionRepo.findActive(teacherId, classId, missionId)
      : undefined
  return mission && missionOf(mission)
}

const create = async (
  teacherId: string,
  classId: string,
  input: MissionInput
) => {
  const fields = missionSchema.parse(input)
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  return missionRepo.insert(schoolClass.id, fields)
}

const update = async (
  teacherId: string,
  classId: string,
  missionId: string,
  input: MissionInput
) => {
  const fields = missionSchema.parse(input)
  const mission =
    isId(classId) && isId(missionId)
      ? await missionRepo.updateActive(teacherId, classId, missionId, fields)
      : undefined
  if (!mission) throw missionNotFound()
}

const remove = async (
  teacherId: string,
  classId: string,
  missionId: string
) => {
  const mission =
    isId(classId) && isId(missionId)
      ? await missionRepo.removeActive(teacherId, classId, missionId)
      : undefined
  if (!mission) throw missionNotFound()
}

const withLockedMission = async <Result>(
  teacherId: string,
  classId: string,
  missionId: string,
  work: (
    transaction: Parameters<Parameters<typeof missionRepo.withLocked>[3]>[0],
    mission: { id: string; published: boolean }
  ) => Promise<Result>
) => {
  if (!isId(classId) || !isId(missionId)) throw missionNotFound()
  return missionRepo.withLocked(
    teacherId,
    classId,
    missionId,
    async (transaction, mission) => {
      if (!mission) throw missionNotFound()
      return work(transaction, {
        id: mission.id,
        published: mission.publishedAt !== null
      })
    }
  )
}

// A draft is hidden from the students, and a published mission never goes back to draft
const publish = async (teacherId: string, classId: string, missionId: string) =>
  withLockedMission(
    teacherId,
    classId,
    missionId,
    async (transaction, mission) => {
      if (mission.published) throw missionAlreadyPublished()
      const objectiveIds = await missionRepo.listObjectiveIds(
        transaction,
        mission.id
      )
      if (objectiveIds.length === 0) throw missionWithoutObjectives()
      await missionRepo.publish(transaction, mission.id)
    }
  )

const listObjectives = async (
  teacherId: string,
  classId: string,
  missionId: string
) =>
  isId(classId) && isId(missionId)
    ? missionRepo.listObjectives(teacherId, classId, missionId)
    : []

const findObjective = async (
  teacherId: string,
  classId: string,
  missionId: string,
  objectiveId: string
) =>
  isId(classId) && isId(missionId) && isId(objectiveId)
    ? missionRepo.findObjective(teacherId, classId, missionId, objectiveId)
    : undefined

const createObjective = async (
  teacherId: string,
  classId: string,
  missionId: string,
  input: ObjectiveInput
) => {
  const fields = objectiveSchema.parse(input)
  return withLockedMission(
    teacherId,
    classId,
    missionId,
    (transaction, mission) =>
      missionRepo.insertObjective(transaction, mission.id, fields)
  )
}

const updateObjective = async (
  teacherId: string,
  classId: string,
  missionId: string,
  objectiveId: string,
  input: ObjectiveInput
) => {
  const fields = objectiveSchema.parse(input)
  const objective =
    isId(classId) && isId(missionId) && isId(objectiveId)
      ? await missionRepo.updateObjective(
          teacherId,
          classId,
          missionId,
          objectiveId,
          fields
        )
      : undefined
  if (!objective) throw objectiveNotFound()
}

// A published mission keeps at least one objective, so the students never find it empty (#96)
const removeObjective = async (
  teacherId: string,
  classId: string,
  missionId: string,
  objectiveId: string
) => {
  if (!isId(objectiveId)) throw objectiveNotFound()
  await withLockedMission(
    teacherId,
    classId,
    missionId,
    async (transaction, mission) => {
      const objectiveIds = await missionRepo.listObjectiveIds(
        transaction,
        mission.id
      )
      if (!objectiveIds.includes(objectiveId)) throw objectiveNotFound()
      if (mission.published && objectiveIds.length === 1) {
        throw lastObjectiveOfPublishedMission()
      }
      await missionRepo.removeObjective(transaction, mission.id, objectiveId)
    }
  )
}

// Gives the position the objective ended at (from 1) and the count, for the list to announce it
const moveObjective = async (
  teacherId: string,
  classId: string,
  missionId: string,
  objectiveId: string,
  direction: string
) => {
  if (!isId(objectiveId)) throw objectiveNotFound()
  const parsedDirection = moveDirectionSchema.parse(direction)
  return withLockedMission(
    teacherId,
    classId,
    missionId,
    async (transaction, mission) => {
      const objectiveIds = await missionRepo.listObjectiveIds(
        transaction,
        mission.id
      )
      const moved = moveItem(objectiveIds, objectiveId, parsedDirection)
      if (!moved) throw objectiveNotFound()
      await missionRepo.writeObjectiveOrder(transaction, mission.id, moved)
      return { position: moved.indexOf(objectiveId) + 1, count: moved.length }
    }
  )
}

export const missionModel = {
  list,
  findOwned,
  create,
  update,
  remove,
  publish,
  listObjectives,
  findObjective,
  createObjective,
  updateObjective,
  removeObjective,
  moveObjective
}
