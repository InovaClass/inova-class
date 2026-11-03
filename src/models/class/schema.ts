import { z } from 'zod'

// Imported by the client forms too, so it must not import anything server-only

const NAME_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 280

export const classSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da turma.')
    .max(
      NAME_MAX_LENGTH,
      `O nome pode ter no máximo ${NAME_MAX_LENGTH} caracteres.`
    ),
  description: z
    .string()
    .trim()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `A descrição pode ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`
    )
    .transform((description) => description || null)
})
export type ClassInput = z.input<typeof classSchema>
