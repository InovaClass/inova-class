'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { powerModel } from '@/models/power/model'
import type { PowerInput } from '@/models/power/schema'

export const updatePower = async (
  classId: string,
  powerId: string,
  input: PowerInput
): Promise<FormState<PowerInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await powerModel.update(user.id, classId, powerId, values)
    revalidatePath('/professor', 'layout')
    redirect(`/professor/turmas/${classId}/poderes`)
  })
