import { z } from 'zod'

import { NotFoundError } from '@/infra/errors'
import { classRepo } from '@/repositories/class-repo'

import { generateJoinCode } from './join-code'
import { type ClassInput, classSchema } from './schema'

const JOIN_CODE_MAX_ATTEMPTS = 5

// The id comes from the URL, and Postgres rejects a value that isn't a UUID instead of finding nothing
const isClassId = (classId: string) => z.uuid().safeParse(classId).success

// Same answer for a class of another teacher and an archived one, so the id reveals nothing
const classNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos essa turma.',
    action: 'Volte ao painel e escolha uma das suas turmas.'
  })

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

export const classModel = {
  list: async (teacherId: string) => classRepo.listActive(teacherId),

  findOwned: async (teacherId: string, classId: string) =>
    isClassId(classId) ? classRepo.findActive(teacherId, classId) : undefined,

  create: async (teacherId: string, input: ClassInput) => {
    const fields = classSchema.parse(input)
    const joinCode = await generateUnusedJoinCode()
    return classRepo.insert(teacherId, { ...fields, joinCode })
  },

  update: async (teacherId: string, classId: string, input: ClassInput) =>
    updateOwned(teacherId, classId, classSchema.parse(input)),

  regenerateJoinCode: async (teacherId: string, classId: string) =>
    updateOwned(teacherId, classId, {
      joinCode: await generateUnusedJoinCode()
    }),

  setJoinCodeEnabled: async (
    teacherId: string,
    classId: string,
    enabled: boolean
  ) =>
    updateOwned(teacherId, classId, {
      joinCodeEnabled: z.boolean().parse(enabled)
    }),

  archive: async (teacherId: string, classId: string) => {
    const schoolClass = isClassId(classId)
      ? await classRepo.archiveActive(teacherId, classId)
      : undefined
    if (!schoolClass) throw classNotFound()
  }
}
