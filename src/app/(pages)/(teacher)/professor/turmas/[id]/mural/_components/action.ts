'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import { messageModel } from '@/models/message/model'
import type { MessageInput } from '@/models/message/schema'

export const setChatEnabled = async (
  classId: string,
  enabled: boolean
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await classModel.setChatEnabled(user.id, classId, enabled)
    revalidatePath('/professor', 'layout')
    return formSuccess(
      enabled ? 'Mural aberto aos alunos.' : 'Mural fechado aos alunos.'
    )
  })

export const postMessage = async (
  classId: string,
  input: MessageInput
): Promise<FormState<MessageInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await messageModel.postAsTeacher(user.id, classId, values)
    revalidatePath('/professor', 'layout')
    return formSuccess('Mensagem enviada.')
  })

export const removeMessage = async (
  classId: string,
  messageId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await messageModel.removeAsTeacher(user.id, classId, messageId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Mensagem removida.')
  })

// Also on the class page's actions, since a page imports only its own `_components/`
export const setStudentMuted = async (
  classId: string,
  studentId: string,
  muted: boolean
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await messageModel.setMuted(user.id, classId, studentId, muted)
    revalidatePath('/professor', 'layout')
    return formSuccess(
      muted ? 'Aluno silenciado no mural.' : 'Aluno reativado no mural.'
    )
  })
