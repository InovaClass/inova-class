import { z } from 'zod'

import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { classRepo } from '@/repositories/class-repo'
import { enrollmentRepo } from '@/repositories/enrollment-repo'

import { JOIN_ATTEMPTS_MAX, JOIN_ATTEMPTS_WINDOW_MINUTES } from './constants'
import { studentNotInClass, tooManyJoinAttempts } from './errors'
import { type JoinClassInput, joinClassSchema } from './schema'

const requireOwnedClass = async (teacherId: string, classId: string) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
}

const MINUTE_IN_MS = 60_000

// Counted before the lookup, so parallel requests can't try more codes than the limit. Past the limit
// even a valid code is rejected, otherwise an answer would still tell which codes exist
const requireJoinAttempt = async (studentId: string) => {
  const now = new Date()
  const windowInMs = JOIN_ATTEMPTS_WINDOW_MINUTES * MINUTE_IN_MS
  const { attempts, windowStartedAt } = await enrollmentRepo.recordJoinAttempt(
    studentId,
    { now, expiredSince: new Date(now.getTime() - windowInMs) }
  )
  if (attempts > JOIN_ATTEMPTS_MAX) {
    const remainingInMs = windowStartedAt.getTime() + windowInMs - now.getTime()
    throw tooManyJoinAttempts(Math.ceil(remainingInMs / MINUTE_IN_MS))
  }
}

const join = async (studentId: string, input: JoinClassInput) => {
  const { code } = joinClassSchema.parse(input)
  await requireJoinAttempt(studentId)
  const schoolClass = await classRepo.findJoinable(code)
  if (!schoolClass) {
    // Same answer for an unknown, a disabled and an archived code, so trying one reveals nothing
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['code'],
        message: 'Esse código não é válido. Confira com o professor da turma.',
        input: code
      }
    ])
  }

  await enrollmentRepo.forgiveJoinAttempt(studentId)
  const enrollment = await enrollmentRepo.insert(studentId, schoolClass.id)
  return { className: schoolClass.name, alreadyEnrolled: !enrollment }
}

const listClasses = async (studentId: string) => {
  const classes = await enrollmentRepo.listActiveClassesOf(studentId)
  // In the model because the collation of the database doesn't have to follow pt-BR
  return classes.toSorted((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

const listRoster = async (teacherId: string, classId: string) => {
  await requireOwnedClass(teacherId, classId)
  const students = await enrollmentRepo.listEnrolledStudents(classId)
  return (
    students
      // A pending student only enters through an invite, so the teacher already has that email;
      // one who joined by code never gave it to the teacher
      .map(({ id, name, username, email, pending }) => ({
        id,
        name,
        username,
        pending,
        email: pending ? email : undefined
      }))
      // In the model because the collation of the database doesn't have to follow pt-BR
      .toSorted((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  )
}

const remove = async (
  teacherId: string,
  classId: string,
  studentId: string
) => {
  await requireOwnedClass(teacherId, classId)
  // The id comes from the client, and Postgres rejects a value that isn't a UUID
  const enrollment = z.uuid().safeParse(studentId).success
    ? await enrollmentRepo.end(classId, studentId)
    : undefined
  if (!enrollment) throw studentNotInClass()
}

export const enrollmentModel = {
  join,
  listClasses,
  listRoster,
  remove
}
