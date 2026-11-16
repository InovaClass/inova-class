'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { powerRequestModel } from '@/models/power-request/model'

export const approvePowerRequest = async (
  classId: string,
  requestId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await powerRequestModel.approve(user.id, classId, requestId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Pedido aprovado. As moedas foram descontadas.')
  })

export const refusePowerRequest = async (
  classId: string,
  requestId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await powerRequestModel.refuse(user.id, classId, requestId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Pedido recusado. As moedas reservadas foram liberadas.')
  })
