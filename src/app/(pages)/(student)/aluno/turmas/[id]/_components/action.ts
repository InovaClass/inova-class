'use server'

import { revalidatePath } from 'next/cache'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { characterModel } from '@/models/character/model'
import type { CharacterInput } from '@/models/character/schema'

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
