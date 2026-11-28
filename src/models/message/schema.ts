import { z } from 'zod'

import { MESSAGE_MAX_LENGTH } from './constants'

// Imported by the client forms too, so it must not import anything server-only

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Escreva a mensagem.')
    .max(
      MESSAGE_MAX_LENGTH,
      `A mensagem pode ter no máximo ${MESSAGE_MAX_LENGTH} caracteres.`
    )
})
export type MessageInput = z.input<typeof messageSchema>
