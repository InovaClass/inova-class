import { z } from 'zod'

import type { CharacterClass } from '@/models/avatar/layers'
import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { levelOf } from '@/models/ledger/level'
import { powerRepo } from '@/repositories/power-repo'

import { powerNotFound } from './errors'
import { type PowerInput, powerSchema } from './schema'

// The ids come from the URL, and Postgres rejects a value that isn't a UUID instead of finding nothing
const isId = (id: string) => z.uuid().safeParse(id).success

type PowerRow = NonNullable<Awaited<ReturnType<typeof powerRepo.findActive>>>

// Every write goes through the schema, which only accepts a character class of the manifest
const powerOf = ({ disabledAt, characterClass, ...power }: PowerRow) => ({
  ...power,
  characterClass: characterClass as CharacterClass,
  disabled: disabledAt !== null
})

const list = async (teacherId: string, classId: string) => {
  const powers = isId(classId)
    ? await powerRepo.listActive(teacherId, classId)
    : []
  return powers.map((power) => powerOf(power))
}

const listForStudent = async (studentId: string, classId: string) => {
  const powers = isId(classId)
    ? await powerRepo.listEnabledOfStudent(studentId, classId)
    : []
  return powers.map(({ id, name, description, cost, minLevel, xp }) => ({
    id,
    name,
    description,
    cost,
    minLevel,
    unlocked: levelOf(xp) >= minLevel
  }))
}

const findOwned = async (
  teacherId: string,
  classId: string,
  powerId: string
) => {
  const power =
    isId(classId) && isId(powerId)
      ? await powerRepo.findActive(teacherId, classId, powerId)
      : undefined
  return power && powerOf(power)
}

const create = async (
  teacherId: string,
  classId: string,
  input: PowerInput
) => {
  const fields = powerSchema.parse(input)
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  return powerRepo.insert(schoolClass.id, fields)
}

const updateOwned = async (
  teacherId: string,
  classId: string,
  powerId: string,
  fields: Parameters<typeof powerRepo.updateActive>[3]
) => {
  const power =
    isId(classId) && isId(powerId)
      ? await powerRepo.updateActive(teacherId, classId, powerId, fields)
      : undefined
  if (!power) throw powerNotFound()
  return power
}

const update = async (
  teacherId: string,
  classId: string,
  powerId: string,
  input: PowerInput
) => updateOwned(teacherId, classId, powerId, powerSchema.parse(input))

const setEnabled = async (
  teacherId: string,
  classId: string,
  powerId: string,
  enabled: boolean
) =>
  updateOwned(teacherId, classId, powerId, {
    disabledAt: enabled ? null : new Date()
  })

const remove = async (teacherId: string, classId: string, powerId: string) => {
  const power =
    isId(classId) && isId(powerId)
      ? await powerRepo.removeActive(teacherId, classId, powerId)
      : undefined
  if (!power) throw powerNotFound()
}

export const powerModel = {
  list,
  listForStudent,
  findOwned,
  create,
  update,
  setEnabled,
  remove
}
