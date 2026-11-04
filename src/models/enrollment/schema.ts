import { z } from 'zod'

import { JOIN_CODE_LENGTH } from '@/models/class/constants'

// Imported by the client forms too, so it must not import anything server-only

export const joinClassSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(
      JOIN_CODE_LENGTH,
      `Informe o código de ${JOIN_CODE_LENGTH} caracteres da turma.`
    )
})
export type JoinClassInput = z.input<typeof joinClassSchema>
