'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { messageModel } from '@/models/message/model'
import type { MessageInput } from '@/models/message/schema'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'
import type { SubmissionInput } from '@/models/objective-submission/schema'

export const submitObjective = async (
  classId: string,
  objectiveId: string,
  input: SubmissionInput
): Promise<FormState<SubmissionInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('student')
    await objectiveSubmissionModel.submit(user.id, classId, objectiveId, values)
    revalidatePath('/aluno', 'layout')
    return formSuccess('Objetivo enviado. Aguarde a avaliação do professor.')
  })

export const postThreadMessage = async (
  classId: string,
  objectiveId: string,
  input: MessageInput
): Promise<FormState<MessageInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('student')
    await messageModel.postToThreadAsStudent(
      user.id,
      classId,
      objectiveId,
      values
    )
    revalidatePath('/aluno', 'layout')
    return formSuccess('Mensagem enviada.')
  })

export const removeThreadMessage = async (
  classId: string,
  messageId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('student')
    await messageModel.removeAsStudent(user.id, classId, messageId)
    revalidatePath('/aluno', 'layout')
    return formSuccess('Mensagem removida.')
  })
