'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { enrollmentModel } from '@/models/enrollment/model'
import type { JoinClassInput } from '@/models/enrollment/schema'

export const joinClass = async (
  input: JoinClassInput
): Promise<FormState<JoinClassInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('student')
    const { className, alreadyEnrolled } = await enrollmentModel.join(
      user.id,
      values
    )
    revalidatePath('/aluno', 'layout')
    return formSuccess(
      alreadyEnrolled
        ? `Você já está na turma ${className}.`
        : `Você entrou na turma ${className}.`
    )
  })
