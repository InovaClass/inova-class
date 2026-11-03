'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import type { ClassInput } from '@/models/class/schema'

export const createClass = async (
  input: ClassInput
): Promise<FormState<ClassInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    const { id } = await classModel.create(user.id, values)
    revalidatePath('/professor', 'layout')
    redirect(`/professor/turmas/${id}`)
  })
