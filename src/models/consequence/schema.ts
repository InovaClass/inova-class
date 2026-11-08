import { z } from 'zod'

import { CONSEQUENCE_NAME_MAX_LENGTH } from './constants'

export const consequenceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe a consequência.')
    .max(
      CONSEQUENCE_NAME_MAX_LENGTH,
      `A consequência pode ter no máximo ${CONSEQUENCE_NAME_MAX_LENGTH} caracteres.`
    )
})
export type ConsequenceInput = z.input<typeof consequenceSchema>
