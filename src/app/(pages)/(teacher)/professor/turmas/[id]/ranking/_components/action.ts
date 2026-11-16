'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

export const setRankingVisible = async (
  classId: string,
  visible: boolean
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await classModel.setRankingVisible(user.id, classId, visible)
    revalidatePath('/professor', 'layout')
    return formSuccess(
      visible ? 'Ranking visível para os alunos.' : 'Ranking oculto dos alunos.'
    )
  })
