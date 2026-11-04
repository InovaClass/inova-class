import { z } from 'zod'

import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { classRepo } from '@/repositories/class-repo'
import { enrollmentRepo } from '@/repositories/enrollment-repo'

import { studentNotInClass } from './errors'
import { type JoinClassInput, joinClassSchema } from './schema'

const requireOwnedClass = async (teacherId: string, classId: string) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
}

export const enrollmentModel = {
  join: async (studentId: string, input: JoinClassInput) => {
    const { code } = joinClassSchema.parse(input)
    const schoolClass = await classRepo.findJoinable(code)
    if (!schoolClass) {
      // Same answer for an unknown, a disabled and an archived code, so trying one reveals nothing
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['code'],
          message:
            'Esse código não é válido. Confira com o professor da turma.',
          input: code
        }
      ])
    }

    const enrollment = await enrollmentRepo.insert(studentId, schoolClass.id)
    return { className: schoolClass.name, alreadyEnrolled: !enrollment }
  },

  listClasses: async (studentId: string) => {
    const classes = await enrollmentRepo.listActiveClassesOf(studentId)
    // In the model because the collation of the database doesn't have to follow pt-BR
    return classes.toSorted((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  },

  listRoster: async (teacherId: string, classId: string) => {
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
  },

  remove: async (teacherId: string, classId: string, studentId: string) => {
    await requireOwnedClass(teacherId, classId)
    // The id comes from the client, and Postgres rejects a value that isn't a UUID
    const enrollment = z.uuid().safeParse(studentId).success
      ? await enrollmentRepo.end(classId, studentId)
      : undefined
    if (!enrollment) throw studentNotInClass()
  }
}
