import { z } from 'zod'

import type { CharacterClass } from '@/models/avatar/layers'
import { CHARACTER_CLASSES } from '@/models/character/look'

import {
  POWER_COST_MAX,
  POWER_DESCRIPTION_MAX_LENGTH,
  POWER_MIN_LEVEL_MAX,
  POWER_NAME_MAX_LENGTH
} from './constants'

// Imported by the client forms too, so it must not import anything server-only

// Coerced, since the form sends what was typed
const wholeNumber = (label: string, max: number) =>
  z.coerce
    .number<string | number>({ error: `${label}: informe um número inteiro.` })
    .int(`${label}: informe um número inteiro.`)
    .min(1, `${label}: use um valor entre 1 e ${max}.`)
    .max(max, `${label}: use um valor entre 1 e ${max}.`)

export const powerSchema = z.object({
  characterClass: z.enum(
    CHARACTER_CLASSES as [CharacterClass, ...CharacterClass[]],
    'Escolha uma classe.'
  ),
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do poder.')
    .max(
      POWER_NAME_MAX_LENGTH,
      `O nome pode ter no máximo ${POWER_NAME_MAX_LENGTH} caracteres.`
    ),
  description: z
    .string()
    .trim()
    .max(
      POWER_DESCRIPTION_MAX_LENGTH,
      `A descrição pode ter no máximo ${POWER_DESCRIPTION_MAX_LENGTH} caracteres.`
    )
    .transform((description) => description || null),
  cost: wholeNumber('Custo', POWER_COST_MAX),
  minLevel: wholeNumber('Nível mínimo', POWER_MIN_LEVEL_MAX)
})
export type PowerInput = z.input<typeof powerSchema>
