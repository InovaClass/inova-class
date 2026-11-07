'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { behaviorModel } from '@/models/behavior/model'
import type { BehaviorInput } from '@/models/behavior/schema'

export const createBehavior = async (
  classId: string,
  input: BehaviorInput
): Promise<FormState<BehaviorInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await behaviorModel.create(user.id, classId, values)
    revalidatePath('/professor', 'layout')
    redirect(`/professor/turmas/${classId}/comportamentos`)
  })
