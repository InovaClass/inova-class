import { z } from 'zod'

import {
  SUBMISSION_LINK_MAX_LENGTH,
  SUBMISSION_TEXT_MAX_LENGTH,
  TEACHER_COMMENT_MAX_LENGTH
} from './constants'

// Imported by the client forms too, so it must not import anything server-only

// Only http and https, since the teacher opens what the student typed. Blank means no link
const optionalHttpLink = z.union([
  z.literal(''),
  z.httpUrl('Informe um link que comece com http:// ou https://.')
])

export const submissionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Conte o que você fez.')
    .max(
      SUBMISSION_TEXT_MAX_LENGTH,
      `O texto pode ter no máximo ${SUBMISSION_TEXT_MAX_LENGTH} caracteres.`
    ),
  link: z
    .string()
    .trim()
    .max(
      SUBMISSION_LINK_MAX_LENGTH,
      `O link pode ter no máximo ${SUBMISSION_LINK_MAX_LENGTH} caracteres.`
    )
    .pipe(optionalHttpLink)
    .transform((link) => link || null)
})
export type SubmissionInput = z.input<typeof submissionSchema>

export const returnSubmissionSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, 'Diga ao aluno o que falta.')
    .max(
      TEACHER_COMMENT_MAX_LENGTH,
      `O comentário pode ter no máximo ${TEACHER_COMMENT_MAX_LENGTH} caracteres.`
    )
})
export type ReturnSubmissionInput = z.input<typeof returnSubmissionSchema>

export const completeObjectiveSchema = z.object({
  studentIds: z.array(z.uuid()).min(1, 'Selecione pelo menos um aluno.')
})
export type CompleteObjectiveInput = z.input<typeof completeObjectiveSchema>
