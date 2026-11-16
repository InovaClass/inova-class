import { NotFoundError, ValidationError } from '@/infra/errors'

// Same answer for a reward of another class and a removed one, so the id reveals nothing
export const rewardNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos essa recompensa.',
    action: 'Atualize a página para ver as recompensas da turma.'
  })

export const rewardOutOfStock = () =>
  new ValidationError({
    message: 'Essa recompensa esgotou.',
    action: 'Escolha outra recompensa ou aguarde o professor repor o estoque.'
  })
