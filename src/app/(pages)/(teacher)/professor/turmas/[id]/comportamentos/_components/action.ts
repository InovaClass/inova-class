'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { behaviorModel } from '@/models/behavior/model'

export const removeBehavior = async (
  classId: string,
  behaviorId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await behaviorModel.remove(user.id, classId, behaviorId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Comportamento removido.')
  })
