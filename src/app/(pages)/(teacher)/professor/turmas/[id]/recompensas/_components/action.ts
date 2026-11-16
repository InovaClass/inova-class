'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { rewardModel } from '@/models/reward/model'

export const removeReward = async (
  classId: string,
  rewardId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await rewardModel.remove(user.id, classId, rewardId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Recompensa removida.')
  })
