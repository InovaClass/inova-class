import { z } from 'zod'

import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { studentNotInClass } from '@/models/enrollment/errors'
import { ledgerModel } from '@/models/ledger/model'
import { consequenceRepo } from '@/repositories/consequence-repo'
import { enrollmentRepo } from '@/repositories/enrollment-repo'

import { pickRandom } from './draw'
import { consequenceNotFound, noConsequencesToDraw } from './errors'
import { type ConsequenceInput, consequenceSchema } from './schema'

// The ids come from the URL, and Postgres rejects a value that isn't a UUID instead of finding nothing
const isId = (id: string) => z.uuid().safeParse(id).success

const list = async (teacherId: string, classId: string) =>
  isId(classId) ? consequenceRepo.listActive(teacherId, classId) : []

const findOwned = async (
  teacherId: string,
  classId: string,
  consequenceId: string
) =>
  isId(classId) && isId(consequenceId)
    ? consequenceRepo.findActive(teacherId, classId, consequenceId)
    : undefined

const create = async (
  teacherId: string,
  classId: string,
  input: ConsequenceInput
) => {
  const fields = consequenceSchema.parse(input)
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  return consequenceRepo.insert(schoolClass.id, fields)
}

const update = async (
  teacherId: string,
  classId: string,
  consequenceId: string,
  input: ConsequenceInput
) => {
  const fields = consequenceSchema.parse(input)
  const consequence =
    isId(classId) && isId(consequenceId)
      ? await consequenceRepo.updateActive(
          teacherId,
          classId,
          consequenceId,
          fields
        )
      : undefined
  if (!consequence) throw consequenceNotFound()
  return consequence
}

const remove = async (
  teacherId: string,
  classId: string,
  consequenceId: string
) => {
  const consequence =
    isId(classId) && isId(consequenceId)
      ? await consequenceRepo.removeActive(teacherId, classId, consequenceId)
      : undefined
  if (!consequence) throw consequenceNotFound()
}

const draw = async (teacherId: string, classId: string, studentId: string) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  if (!isId(studentId)) throw studentNotInClass()
  const [enrollmentId] = await enrollmentRepo.listActiveIds(schoolClass.id, [
    studentId
  ])
  if (!enrollmentId) throw studentNotInClass()

  const consequence = pickRandom(await list(teacherId, schoolClass.id))
  if (!consequence) throw noConsequencesToDraw()

  await ledgerModel.restoreFallen(enrollmentId, consequence.id, teacherId)
  return consequence
}

export const consequenceModel = {
  list,
  findOwned,
  create,
  update,
  remove,
  draw
}
