import { z } from 'zod'

import {
  REWARD_DESCRIPTION_MAX_LENGTH,
  REWARD_NAME_MAX_LENGTH,
  REWARD_PRICE_MAX,
  REWARD_STOCK_MAX
} from './constants'

// Imported by the client forms too, so it must not import anything server-only

const STOCK_MESSAGE = `Estoque: use um valor entre 0 e ${REWARD_STOCK_MAX}, ou deixe em branco.`

export const rewardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da recompensa.')
    .max(
      REWARD_NAME_MAX_LENGTH,
      `O nome pode ter no máximo ${REWARD_NAME_MAX_LENGTH} caracteres.`
    ),
  description: z
    .string()
    .trim()
    .max(
      REWARD_DESCRIPTION_MAX_LENGTH,
      `A descrição pode ter no máximo ${REWARD_DESCRIPTION_MAX_LENGTH} caracteres.`
    )
    .transform((description) => description || null),
  // Coerced, since the form sends what was typed
  price: z.coerce
    .number<string | number>({ error: 'Preço: informe um número inteiro.' })
    .int('Preço: informe um número inteiro.')
    .min(1, `Preço: use um valor entre 1 e ${REWARD_PRICE_MAX}.`)
    .max(
      REWARD_PRICE_MAX,
      `Preço: use um valor entre 1 e ${REWARD_PRICE_MAX}.`
    ),
  // Blank means a reward without a limit
  stock: z
    .union([z.string().trim(), z.number(), z.null()])
    .transform((stock) => (stock === '' ? null : stock))
    .pipe(
      z.coerce
        .number<string | number>({ error: STOCK_MESSAGE })
        .int(STOCK_MESSAGE)
        .min(0, STOCK_MESSAGE)
        .max(REWARD_STOCK_MAX, STOCK_MESSAGE)
        .nullable()
    )
})
export type RewardInput = z.input<typeof rewardSchema>
