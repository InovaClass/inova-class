import { ValidationError } from '@/infra/errors'

export const invalidInvite = () =>
  new ValidationError({
    message: 'Este convite é inválido ou expirou.',
    action: 'Peça um novo link ou fale com o professor da turma.'
  })
