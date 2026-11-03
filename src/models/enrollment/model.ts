import { z } from 'zod'

import { classRepo } from '@/repositories/class-repo'
import { enrollmentRepo } from '@/repositories/enrollment-repo'

import { type JoinClassInput, joinClassSchema } from './schema'

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
  }
}
