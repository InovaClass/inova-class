'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { consequenceModel } from '@/models/consequence/model'
import type { ConsequenceInput } from '@/models/consequence/schema'

export const createConsequence = async (
  classId: string,
  input: ConsequenceInput
): Promise<FormState<ConsequenceInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await consequenceModel.create(user.id, classId, values)
    revalidatePath('/professor', 'layout')
    redirect(`/professor/turmas/${classId}/consequencias`)
  })
