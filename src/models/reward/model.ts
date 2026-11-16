import { z } from 'zod'

import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { rewardRepo } from '@/repositories/reward-repo'

import { rewardNotFound } from './errors'
import { type RewardInput, rewardSchema } from './schema'

// The ids come from the URL, and Postgres rejects a value that isn't a UUID instead of finding nothing
const isId = (id: string) => z.uuid().safeParse(id).success

const list = async (teacherId: string, classId: string) =>
  isId(classId) ? rewardRepo.listActive(teacherId, classId) : []

const findOwned = async (
  teacherId: string,
  classId: string,
  rewardId: string
) =>
  isId(classId) && isId(rewardId)
    ? rewardRepo.findActive(teacherId, classId, rewardId)
    : undefined

const create = async (
  teacherId: string,
  classId: string,
  input: RewardInput
) => {
  const fields = rewardSchema.parse(input)
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  return rewardRepo.insert(schoolClass.id, fields)
}

// Editing changes only the next purchases: an order keeps the price it was paid with
const update = async (
  teacherId: string,
  classId: string,
  rewardId: string,
  input: RewardInput
) => {
  const fields = rewardSchema.parse(input)
  const reward =
    isId(classId) && isId(rewardId)
      ? await rewardRepo.updateActive(teacherId, classId, rewardId, fields)
      : undefined
  if (!reward) throw rewardNotFound()
  return reward
}

const remove = async (teacherId: string, classId: string, rewardId: string) => {
  const reward =
    isId(classId) && isId(rewardId)
      ? await rewardRepo.removeActive(teacherId, classId, rewardId)
      : undefined
  if (!reward) throw rewardNotFound()
}

export const rewardModel = {
  list,
  findOwned,
  create,
  update,
  remove
}
