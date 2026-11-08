'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { consequenceModel } from '@/models/consequence/model'

export const drawConsequence = async (
  classId: string,
  studentId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    const { name } = await consequenceModel.draw(user.id, classId, studentId)
    revalidatePath('/professor', 'layout')
    return formSuccess(name)
  })
