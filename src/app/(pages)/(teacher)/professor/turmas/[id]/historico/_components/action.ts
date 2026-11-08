'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { ledgerModel } from '@/models/ledger/model'

export const reverseEntry = async (
  classId: string,
  entryId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await ledgerModel.reverseEntry(user.id, classId, entryId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Lançamento revertido.')
  })
