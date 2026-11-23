'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { missionModel } from '@/models/mission/model'

export const removeMission = async (
  classId: string,
  missionId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await missionModel.remove(user.id, classId, missionId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Missão removida.')
  })
