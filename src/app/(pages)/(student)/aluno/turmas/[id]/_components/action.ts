'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { characterModel } from '@/models/character/model'
import type { CharacterInput } from '@/models/character/schema'
import { powerRequestModel } from '@/models/power-request/model'

export const chooseCharacter = async (
  classId: string,
  input: CharacterInput
): Promise<FormState<CharacterInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('student')
    await characterModel.choose(user.id, classId, values)
    revalidatePath('/aluno', 'layout')
    return formSuccess('Personagem escolhido.')
  })

// Takes the whole character so the form keeps one shape; the model ignores the character class
export const updateAppearance = async (
  classId: string,
  input: CharacterInput
): Promise<FormState<CharacterInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('student')
    await characterModel.updateAppearance(user.id, classId, values)
    revalidatePath('/aluno', 'layout')
    return formSuccess('Aparência salva.')
  })

export const requestPower = async (
  classId: string,
  powerId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('student')
    await powerRequestModel.request(user.id, classId, powerId)
    revalidatePath('/aluno', 'layout')
    return formSuccess('Pedido enviado. Aguarde a resposta do professor.')
  })

export const cancelPowerRequest = async (
  classId: string,
  requestId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('student')
    await powerRequestModel.cancel(user.id, classId, requestId)
    revalidatePath('/aluno', 'layout')
    return formSuccess(
      'Pedido cancelado. As moedas voltaram a ficar disponíveis.'
    )
  })
