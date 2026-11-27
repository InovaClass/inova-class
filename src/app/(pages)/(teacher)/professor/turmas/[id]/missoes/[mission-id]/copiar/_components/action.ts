'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { missionModel } from '@/models/mission/model'
import type { CopyMissionInput } from '@/models/mission/schema'

export const copyMission = async (
  classId: string,
  missionId: string,
  input: CopyMissionInput
): Promise<FormState<CopyMissionInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    const copy = await missionModel.copy(user.id, classId, missionId, values)
    revalidatePath('/professor', 'layout')
    redirect(`/professor/turmas/${values.targetClassId}/missoes/${copy.id}`)
  })
