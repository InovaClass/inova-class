import { z } from 'zod'

import { NotFoundError } from '@/infra/errors'
import { classRepo } from '@/repositories/class-repo'

import { type ClassInput, classSchema } from './schema'

// The id comes from the URL, and Postgres rejects a value that isn't a UUID instead of finding nothing
const isClassId = (classId: string) => z.uuid().safeParse(classId).success

// Same answer for a class of another teacher and an archived one, so the id reveals nothing
const classNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos essa turma.',
    action: 'Volte ao painel e escolha uma das suas turmas.'
  })

export const classModel = {
  list: async (teacherId: string) => classRepo.listActive(teacherId),

  findOwned: async (teacherId: string, classId: string) =>
    isClassId(classId) ? classRepo.findActive(teacherId, classId) : undefined,

  create: async (teacherId: string, input: ClassInput) =>
    classRepo.insert(teacherId, classSchema.parse(input)),

  update: async (teacherId: string, classId: string, input: ClassInput) => {
    const fields = classSchema.parse(input)
    const schoolClass = isClassId(classId)
      ? await classRepo.updateActive(teacherId, classId, fields)
      : undefined
    if (!schoolClass) throw classNotFound()
    return schoolClass
  },

  archive: async (teacherId: string, classId: string) => {
    const schoolClass = isClassId(classId)
      ? await classRepo.archiveActive(teacherId, classId)
      : undefined
    if (!schoolClass) throw classNotFound()
  }
}
