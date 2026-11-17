import { z } from 'zod'

import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { classEventModel } from '@/models/class-event/model'
import { levelOf } from '@/models/ledger/level'
import { ledgerModel } from '@/models/ledger/model'
import { powerNotFound } from '@/models/power/errors'
import { powerModel } from '@/models/power/model'
import { powerRequestRepo } from '@/repositories/power-request-repo'

import { availableCoins } from './balance'
import {
  notEnoughAvailableCoins,
  powerAlreadyRequested,
  powerLocked,
  requestNotFound
} from './errors'

// The ids come from the URL or the client, and Postgres rejects a value that isn't a UUID
const isId = (id: string) => z.uuid().safeParse(id).success

const announce = (classId: string) =>
  classEventModel.publish(classId, 'power-request')

const request = async (studentId: string, classId: string, powerId: string) => {
  if (!isId(classId)) throw classNotFound()
  if (!isId(powerId)) throw powerNotFound()
  const created = await powerRequestRepo.reserve(
    studentId,
    classId,
    powerId,
    ({ xp, coins, power, pending }) => {
      if (!power) throw powerNotFound()
      if (levelOf(xp) < power.minLevel) throw powerLocked()
      if (pending.some((request) => request.powerId === power.id)) {
        throw powerAlreadyRequested()
      }
      if (availableCoins(coins, pending) < power.cost) {
        throw notEnoughAvailableCoins()
      }
    }
  )
  if (!created) throw classNotFound()
  await announce(classId)
  return created
}

const listForStudent = async (studentId: string, classId: string) => {
  const reservations = isId(classId)
    ? await powerRequestRepo.findReservations(studentId, classId)
    : undefined
  if (!reservations) return

  const { coins, pending } = reservations
  const available = availableCoins(coins, pending)
  const powers = await powerModel.listForStudent(studentId, classId)
  return {
    coins,
    availableCoins: available,
    pending,
    powers: powers.map((power) => {
      const requested = pending.some(({ powerId }) => powerId === power.id)
      return {
        ...power,
        requested,
        affordable: requested || available >= power.cost
      }
    })
  }
}

const cancel = async (
  studentId: string,
  classId: string,
  requestId: string
) => {
  const canceled =
    isId(classId) && isId(requestId)
      ? await powerRequestRepo.cancel(studentId, classId, requestId)
      : undefined
  if (!canceled) throw requestNotFound()
  await announce(classId)
}

const requireOwnedClass = async (teacherId: string, classId: string) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  return schoolClass
}

const approve = async (
  teacherId: string,
  classId: string,
  requestId: string
) => {
  const schoolClass = await requireOwnedClass(teacherId, classId)
  const pending = isId(requestId)
    ? await powerRequestRepo.findPending(schoolClass.id, requestId)
    : undefined
  if (!pending) throw requestNotFound()

  await ledgerModel.spendOnPower(
    pending.enrollmentId,
    { powerId: pending.powerId, cost: pending.cost, createdById: teacherId },
    async (transaction, entryId) => {
      const settled = await powerRequestRepo.settle(
        schoolClass.id,
        requestId,
        { status: 'approved', ledgerEntryId: entryId, decidedById: teacherId },
        transaction
      )
      if (!settled) throw requestNotFound()
    }
  )
  await announce(schoolClass.id)
}

const refuse = async (
  teacherId: string,
  classId: string,
  requestId: string
) => {
  const schoolClass = await requireOwnedClass(teacherId, classId)
  const settled = isId(requestId)
    ? await powerRequestRepo.settle(schoolClass.id, requestId, {
        status: 'refused',
        decidedById: teacherId
      })
    : undefined
  if (!settled) throw requestNotFound()
  await announce(schoolClass.id)
}

const listPending = async (teacherId: string, classId: string) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) return
  const requests = await powerRequestRepo.listPendingOfClass(schoolClass.id)
  return {
    schoolClass,
    requests: requests.map(
      ({ studentEmail, studentUsername, studentPending, ...request }) => ({
        ...request,
        // Same rule as the roster: only a pending student's email is the teacher's to see
        studentDetail: studentPending ? studentEmail : studentUsername
      })
    )
  }
}

const countPending = async (teacherId: string, classId: string) =>
  isId(classId)
    ? powerRequestRepo.countPendingOfOwnedClass(teacherId, classId)
    : 0

export const powerRequestModel = {
  request,
  listForStudent,
  cancel,
  approve,
  refuse,
  listPending,
  countPending
}
