'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { messageModel } from '@/models/message/model'
import type { MessageInput } from '@/models/message/schema'
import { missionModel } from '@/models/mission/model'

export const publishMission = async (
  classId: string,
  missionId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await missionModel.publish(user.id, classId, missionId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Missão publicada. Os alunos já podem vê-la.')
  })

export const moveObjective = async (
  classId: string,
  missionId: string,
  objectiveId: string,
  direction: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    const { position, count } = await missionModel.moveObjective(
      user.id,
      classId,
      missionId,
      objectiveId,
      direction
    )
    revalidatePath('/professor', 'layout')
    return formSuccess(`Objetivo na posição ${position} de ${count}.`)
  })

export const removeObjective = async (
  classId: string,
  missionId: string,
  objectiveId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await missionModel.removeObjective(user.id, classId, missionId, objectiveId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Objetivo removido.')
  })

export const postThreadMessage = async (
  classId: string,
  objectiveId: string,
  input: MessageInput
): Promise<FormState<MessageInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await messageModel.postToThreadAsTeacher(
      user.id,
      classId,
      objectiveId,
      values
    )
    revalidatePath('/professor', 'layout')
    return formSuccess('Mensagem enviada.')
  })

export const removeThreadMessage = async (
  classId: string,
  messageId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await messageModel.removeAsTeacher(user.id, classId, messageId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Mensagem removida.')
  })

// Also on the board's and the class page's actions, since a page imports only its own `_components/`
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
      muted
        ? 'Aluno silenciado nas mensagens da turma.'
        : 'Aluno reativado nas mensagens da turma.'
    )
  })
