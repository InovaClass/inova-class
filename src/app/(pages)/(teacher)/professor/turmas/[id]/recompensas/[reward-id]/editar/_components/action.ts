'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { rewardModel } from '@/models/reward/model'
import type { RewardInput } from '@/models/reward/schema'

export const updateReward = async (
  classId: string,
  rewardId: string,
  input: RewardInput
): Promise<FormState<RewardInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await rewardModel.update(user.id, classId, rewardId, values)
    revalidatePath('/professor', 'layout')
    redirect(`/professor/turmas/${classId}/recompensas`)
  })
