'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { rewardModel } from '@/models/reward/model'
import type { RewardInput } from '@/models/reward/schema'

export const createReward = async (
  classId: string,
  input: RewardInput
): Promise<FormState<RewardInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await rewardModel.create(user.id, classId, values)
    revalidatePath('/professor', 'layout')
    redirect(`/professor/turmas/${classId}/recompensas`)
  })
