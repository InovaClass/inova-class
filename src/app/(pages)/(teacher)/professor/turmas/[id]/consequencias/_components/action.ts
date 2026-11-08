'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { consequenceModel } from '@/models/consequence/model'

export const removeConsequence = async (
  classId: string,
  consequenceId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await consequenceModel.remove(user.id, classId, consequenceId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Consequência removida.')
  })
