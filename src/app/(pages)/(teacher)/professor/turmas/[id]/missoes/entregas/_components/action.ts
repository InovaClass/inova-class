'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'
import type { ReturnSubmissionInput } from '@/models/objective-submission/schema'

export const approveSubmission = async (
  classId: string,
  submissionId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await objectiveSubmissionModel.approve(user.id, classId, submissionId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Entrega aprovada. A recompensa foi lançada.')
  })

export const returnSubmission = async (
  classId: string,
  submissionId: string,
  input: ReturnSubmissionInput
): Promise<FormState<ReturnSubmissionInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await objectiveSubmissionModel.returnSubmission(
      user.id,
      classId,
      submissionId,
      values
    )
    revalidatePath('/professor', 'layout')
    return formSuccess('Entrega devolvida ao aluno com o seu comentário.')
  })
