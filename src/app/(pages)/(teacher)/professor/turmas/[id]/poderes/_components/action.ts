'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { powerModel } from '@/models/power/model'

export const setPowerEnabled = async (
  classId: string,
  powerId: string,
  enabled: boolean
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await powerModel.setEnabled(user.id, classId, powerId, enabled)
    revalidatePath('/professor', 'layout')
    return formSuccess(enabled ? 'Poder reativado.' : 'Poder desativado.')
  })

export const removePower = async (
  classId: string,
  powerId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await powerModel.remove(user.id, classId, powerId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Poder removido.')
  })
