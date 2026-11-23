'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { missionModel } from '@/models/mission/model'
import type { MissionInput } from '@/models/mission/schema'

export const createMission = async (
  classId: string,
  input: MissionInput
): Promise<FormState<MissionInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    const mission = await missionModel.create(user.id, classId, values)
    revalidatePath('/professor', 'layout')
    // A new mission has no objectives yet, so the teacher goes straight to them
    redirect(`/professor/turmas/${classId}/missoes/${mission.id}`)
  })
