'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
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

export const setItemShopEnabled = async (
  classId: string,
  enabled: boolean
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await classModel.setItemShopEnabled(user.id, classId, enabled)
    revalidatePath('/professor', 'layout')
    return formSuccess(
      enabled ? 'Loja de itens aberta.' : 'Loja de itens fechada.'
    )
  })
