'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { missionModel } from '@/models/mission/model'
import type { MissionInput } from '@/models/mission/schema'

export const updateMission = async (
  classId: string,
  missionId: string,
  input: MissionInput
): Promise<FormState<MissionInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await missionModel.update(user.id, classId, missionId, values)
    revalidatePath('/professor', 'layout')
    redirect(`/professor/turmas/${classId}/missoes`)
  })
