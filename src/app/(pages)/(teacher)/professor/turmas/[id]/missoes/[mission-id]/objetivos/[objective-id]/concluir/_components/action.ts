'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'
import type { CompleteObjectiveInput } from '@/models/objective-submission/schema'

export const completeObjective = async (
  classId: string,
  missionId: string,
  objectiveId: string,
  input: CompleteObjectiveInput
): Promise<FormState<CompleteObjectiveInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    const { objectiveName, studentCount } =
      await objectiveSubmissionModel.complete(
        user.id,
        classId,
        missionId,
        objectiveId,
        values
      )
    revalidatePath('/professor', 'layout')
    return formSuccess(
      `${objectiveName}: concluído para ${studentCount} ${studentCount === 1 ? 'aluno' : 'alunos'}.`
    )
  })
