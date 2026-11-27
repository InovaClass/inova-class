import { z } from 'zod'

import { HP_MAX } from '@/constants/game'

import {
  MISSION_DESCRIPTION_MAX_LENGTH,
  MISSION_NAME_MAX_LENGTH,
  OBJECTIVE_COINS_MAX,
  OBJECTIVE_NAME_MAX_LENGTH,
  OBJECTIVE_STORY_MAX_LENGTH,
  OBJECTIVE_XP_MAX
} from './constants'
import { MISSION_MAP_IDS } from './maps'
import { MOVE_DIRECTIONS } from './order'

// Imported by the client forms too, so it must not import anything server-only

const name = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Informe o nome ${label}.`)
    .max(max, `O nome pode ter no máximo ${max} caracteres.`)

export const missionSchema = z.object({
  name: name('da missão', MISSION_NAME_MAX_LENGTH),
  description: z
    .string()
    .trim()
    .max(
      MISSION_DESCRIPTION_MAX_LENGTH,
      `A descrição pode ter no máximo ${MISSION_DESCRIPTION_MAX_LENGTH} caracteres.`
    )
    .transform((description) => description || null),
  map: z.enum(MISSION_MAP_IDS, { error: 'Escolha um mapa.' })
})
export type MissionInput = z.input<typeof missionSchema>

// Coerced, since the form sends what was typed. A blank value counts as zero, as on behaviors
const points = (label: string, max: number) =>
  z.coerce
    .number<string | number>({ error: `${label}: informe um número inteiro.` })
    .int(`${label}: informe um número inteiro.`)
    .min(0, `${label}: use um valor entre 0 e ${max}.`)
    .max(max, `${label}: use um valor entre 0 e ${max}.`)

const PENALTY_FIELDS = ['latePenaltyCoins', 'latePenaltyHp'] as const

export const objectiveSchema = z
  .object({
    name: name('do objetivo', OBJECTIVE_NAME_MAX_LENGTH),
    story: z
      .string()
      .trim()
      .min(1, 'Conte a história do objetivo.')
      .max(
        OBJECTIVE_STORY_MAX_LENGTH,
        `A história pode ter no máximo ${OBJECTIVE_STORY_MAX_LENGTH} caracteres.`
      ),
    dueOn: z
      .union([z.literal(''), z.iso.date('Informe uma data válida.')])
      .transform((dueOn) => dueOn || null),
    xpReward: points('XP', OBJECTIVE_XP_MAX),
    coinReward: points('Moedas', OBJECTIVE_COINS_MAX),
    latePenaltyCoins: points('Moedas por atraso', OBJECTIVE_COINS_MAX),
    latePenaltyHp: points('HP por atraso', HP_MAX)
  })
  .superRefine((values, context) => {
    if (values.xpReward + values.coinReward === 0) {
      context.addIssue({
        code: 'custom',
        path: ['xpReward'],
        message: 'Informe o XP ou as moedas que o objetivo dá.'
      })
    }
    // The penalty only applies to a submission after the due date
    if (values.dueOn) return
    for (const field of PENALTY_FIELDS) {
      if (values[field] === 0) continue
      context.addIssue({
        code: 'custom',
        path: [field],
        message: 'Defina o prazo para aplicar uma penalidade por atraso.'
      })
    }
  })
export type ObjectiveInput = z.input<typeof objectiveSchema>

export const moveDirectionSchema = z.enum(MOVE_DIRECTIONS)

export const copyMissionSchema = z.object({
  targetClassId: z.string().min(1, 'Escolha a turma.')
})
export type CopyMissionInput = z.input<typeof copyMissionSchema>
