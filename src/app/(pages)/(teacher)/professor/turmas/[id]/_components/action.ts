'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

export const archiveClass = async (classId: string): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await classModel.archive(user.id, classId)
    revalidatePath('/professor', 'layout')
    redirect('/professor')
  })
