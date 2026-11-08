import { z } from 'zod'

import { DEFAULT_BEHAVIORS } from '@/models/behavior/constants'
import { DEFAULT_CONSEQUENCES } from '@/models/consequence/constants'
import { classRepo } from '@/repositories/class-repo'

import { classNotFound } from './errors'
import { generateJoinCode } from './join-code'
import { type ClassInput, classSchema } from './schema'

const JOIN_CODE_MAX_ATTEMPTS = 5

// The id comes from the URL, and Postgres rejects a value that isn't a UUID instead of finding nothing
const isClassId = (classId: string) => z.uuid().safeParse(classId).success

const generateUnusedJoinCode = async () => {
  for (let attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt++) {
    const joinCode = generateJoinCode()
    if (!(await classRepo.isJoinCodeTaken(joinCode))) return joinCode
  }
  throw new Error(
    `No unused join code after ${JOIN_CODE_MAX_ATTEMPTS} attempts`
  )
}

const updateOwned = async (
  teacherId: string,
  classId: string,
  fields: Parameters<typeof classRepo.updateActive>[2]
) => {
  const schoolClass = isClassId(classId)
    ? await classRepo.updateActive(teacherId, classId, fields)
    : undefined
  if (!schoolClass) throw classNotFound()
  return schoolClass
}

const list = async (teacherId: string) => classRepo.listActive(teacherId)

const listArchived = async (teacherId: string) =>
  classRepo.listArchived(teacherId)

const findOwned = async (teacherId: string, classId: string) =>
  isClassId(classId) ? classRepo.findActive(teacherId, classId) : undefined

const create = async (teacherId: string, input: ClassInput) => {
  const fields = classSchema.parse(input)
  const joinCode = await generateUnusedJoinCode()
  return classRepo.insert(
    teacherId,
    { ...fields, joinCode },
    { behaviors: DEFAULT_BEHAVIORS, consequences: DEFAULT_CONSEQUENCES }
  )
}

const update = async (teacherId: string, classId: string, input: ClassInput) =>
  updateOwned(teacherId, classId, classSchema.parse(input))

const regenerateJoinCode = async (teacherId: string, classId: string) =>
  updateOwned(teacherId, classId, {
    joinCode: await generateUnusedJoinCode()
  })

const setJoinCodeEnabled = async (
  teacherId: string,
  classId: string,
  enabled: boolean
) =>
  updateOwned(teacherId, classId, {
    joinCodeEnabled: z.boolean().parse(enabled)
  })

const archive = async (teacherId: string, classId: string) => {
  const schoolClass = isClassId(classId)
    ? await classRepo.archiveActive(teacherId, classId)
    : undefined
  if (!schoolClass) throw classNotFound()
}

const restore = async (teacherId: string, classId: string) => {
  const schoolClass = isClassId(classId)
    ? await classRepo.restoreArchived(teacherId, classId)
    : undefined
  if (!schoolClass) throw classNotFound()
}

export const classModel = {
  list,
  listArchived,
  findOwned,
  create,
  update,
  regenerateJoinCode,
  setJoinCodeEnabled,
  archive,
  restore
}
