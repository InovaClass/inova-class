'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { messageModel } from '@/models/message/model'
import type { MessageInput } from '@/models/message/schema'

export const postMessage = async (
  classId: string,
  input: MessageInput
): Promise<FormState<MessageInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('student')
    await messageModel.postAsStudent(user.id, classId, values)
    revalidatePath('/aluno', 'layout')
    return formSuccess('Mensagem enviada.')
  })

export const removeMessage = async (
  classId: string,
  messageId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('student')
    await messageModel.removeAsStudent(user.id, classId, messageId)
    revalidatePath('/aluno', 'layout')
    return formSuccess('Mensagem removida.')
  })
