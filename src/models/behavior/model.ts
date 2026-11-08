import { z } from 'zod'

import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { studentNotInClass } from '@/models/enrollment/errors'
import { batchNotFound } from '@/models/ledger/errors'
import { ledgerModel } from '@/models/ledger/model'
import { behaviorRepo } from '@/repositories/behavior-repo'
import { enrollmentRepo } from '@/repositories/enrollment-repo'

import { behaviorNotFound } from './errors'
import { kindOf } from './kind'
import { type BehaviorInput, behaviorSchema } from './schema'

// The ids come from the URL, and Postgres rejects a value that isn't a UUID instead of finding nothing
const isId = (id: string) => z.uuid().safeParse(id).success

const list = async (teacherId: string, classId: string) => {
  const behaviors = isId(classId)
    ? await behaviorRepo.listActive(teacherId, classId)
    : []
  // Every write goes through the schema, which only accepts values of one kind
  return behaviors.map((behavior) => ({
    ...behavior,
    kind: kindOf(behavior) ?? 'positive'
  }))
}

const findOwned = async (
  teacherId: string,
  classId: string,
  behaviorId: string
) =>
  isId(classId) && isId(behaviorId)
    ? behaviorRepo.findActive(teacherId, classId, behaviorId)
    : undefined

const create = async (
  teacherId: string,
  classId: string,
  input: BehaviorInput
) => {
  const fields = behaviorSchema.parse(input)
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  return behaviorRepo.insert(schoolClass.id, fields)
}

const update = async (
  teacherId: string,
  classId: string,
  behaviorId: string,
  input: BehaviorInput
) => {
  const fields = behaviorSchema.parse(input)
  const behavior =
    isId(classId) && isId(behaviorId)
      ? await behaviorRepo.updateActive(teacherId, classId, behaviorId, fields)
      : undefined
  if (!behavior) throw behaviorNotFound()
  return behavior
}

const remove = async (
  teacherId: string,
  classId: string,
  behaviorId: string
) => {
  const behavior =
    isId(classId) && isId(behaviorId)
      ? await behaviorRepo.removeActive(teacherId, classId, behaviorId)
      : undefined
  if (!behavior) throw behaviorNotFound()
}

const award = async (
  teacherId: string,
  classId: string,
  behaviorId: string,
  studentIds: string[]
) => {
  const behavior = await findOwned(teacherId, classId, behaviorId)
  if (!behavior) throw behaviorNotFound()

  const uniqueStudentIds = [...new Set(studentIds)]
  if (
    uniqueStudentIds.length === 0 ||
    uniqueStudentIds.some((id) => !isId(id))
  ) {
    throw studentNotInClass()
  }
  const enrollmentIds = await enrollmentRepo.listActiveIds(
    classId,
    uniqueStudentIds
  )
  if (enrollmentIds.length !== uniqueStudentIds.length) {
    throw studentNotInClass()
  }

  const batchId = await ledgerModel.recordBatch(enrollmentIds, {
    type: 'behavior',
    xpDelta: behavior.xp,
    hpDelta: behavior.hp,
    coinDelta: behavior.coins,
    sourceId: behavior.id,
    createdById: teacherId
  })
  return {
    batchId,
    behaviorName: behavior.name,
    studentCount: enrollmentIds.length
  }
}

const undoAward = async (
  teacherId: string,
  classId: string,
  batchId: string
) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  if (!isId(batchId)) throw batchNotFound()
  await ledgerModel.reverseBatch(schoolClass.id, batchId, teacherId)
}

export const behaviorModel = {
  list,
  findOwned,
  create,
  update,
  remove,
  award,
  undoAward
}
