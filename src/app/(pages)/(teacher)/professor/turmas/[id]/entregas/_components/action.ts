'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { rewardOrderModel } from '@/models/reward-order/model'

export const deliverRewardOrder = async (
  classId: string,
  orderId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await rewardOrderModel.deliver(user.id, classId, orderId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Recompensa entregue.')
  })

export const cancelRewardOrder = async (
  classId: string,
  orderId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await rewardOrderModel.cancel(user.id, classId, orderId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Pedido cancelado. As moedas voltaram para o aluno.')
  })
