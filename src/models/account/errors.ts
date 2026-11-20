import { z } from 'zod'

import { UnauthorizedError, ValidationError } from '@/infra/errors'

export const wrongPassword = () =>
  new z.ZodError([
    {
      code: 'custom',
      path: ['password'],
      message: 'Senha incorreta.',
      input: undefined
    }
  ])

export const staleSession = () =>
  new UnauthorizedError({
    message: 'Por segurança, entre de novo antes de excluir a conta.',
    action: 'Saia, entre com o Google e tente outra vez.'
  })

export const studentNotDeletable = () =>
  new ValidationError({
    message: 'Não é possível excluir a conta deste aluno.',
    action: 'Para tirar o aluno desta turma, use “Remover”.'
  })
