'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
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
