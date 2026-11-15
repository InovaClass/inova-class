'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { enrollmentModel } from '@/models/enrollment/model'
import type { JoinClassInput } from '@/models/enrollment/schema'

export const joinClass = async (
  input: JoinClassInput
): Promise<FormState<JoinClassInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('student')
    const { classId } = await enrollmentModel.join(user.id, values)
    revalidatePath('/aluno', 'layout')
    // The class page asks for the character on the first access, so the student goes straight to it
    redirect(`/aluno/turmas/${classId}`)
  })
