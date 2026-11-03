'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import type { ClassInput } from '@/models/class/schema'

export const updateClass = async (
  classId: string,
  input: ClassInput
): Promise<FormState<ClassInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await classModel.update(user.id, classId, values)
    revalidatePath('/professor', 'layout')
    redirect(`/professor/turmas/${classId}`)
  })
