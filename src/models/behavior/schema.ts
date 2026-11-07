import { z } from 'zod'

import { HP_MAX } from '@/constants/game'

import {
  BEHAVIOR_COINS_MAX,
  BEHAVIOR_NAME_MAX_LENGTH,
  BEHAVIOR_XP_MAX
} from './constants'
import { kindOf } from './kind'

// Imported by the client forms too, so it must not import anything server-only

// Coerced, since the form sends what was typed. A blank value counts as zero, so the teacher leaves
// out what doesn't change
const points = (label: string, min: number, max: number) =>
  z.coerce
    .number<string | number>({ error: `${label}: informe um número inteiro.` })
    .int(`${label}: informe um número inteiro.`)
    .min(min, `${label}: use um valor entre ${min} e ${max}.`)
    .max(max, `${label}: use um valor entre ${min} e ${max}.`)

const POINT_FIELDS = ['xp', 'hp', 'coins'] as const

export const behaviorSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Informe o nome do comportamento.')
      .max(
        BEHAVIOR_NAME_MAX_LENGTH,
        `O nome pode ter no máximo ${BEHAVIOR_NAME_MAX_LENGTH} caracteres.`
      ),
    xp: points('XP', 0, BEHAVIOR_XP_MAX),
    hp: points('HP', -HP_MAX, HP_MAX),
    coins: points('Moedas', -BEHAVIOR_COINS_MAX, BEHAVIOR_COINS_MAX)
  })
  // On the field to fix: the first value against the sign of the first non-zero one, or XP when all
  // of them are zero
  .superRefine((values, context) => {
    if (kindOf(values)) return
    const [first, ...others] = POINT_FIELDS.filter((name) => values[name] !== 0)
    const opposite =
      first &&
      others.find(
        (name) => Math.sign(values[name]) !== Math.sign(values[first])
      )
    context.addIssue({
      code: 'custom',
      path: [opposite ?? 'xp'],
      message: opposite
        ? 'Use valores só positivos ou só negativos: um comportamento dá pontos ou tira pontos.'
        : 'Informe pelo menos um valor diferente de zero.'
    })
  })
export type BehaviorInput = z.input<typeof behaviorSchema>
