import { NotFoundError, ValidationError } from '@/infra/errors'

export const notEnoughCoins = () =>
  new ValidationError({
    message: 'Você não tem moedas suficientes.',
    action: 'Junte mais moedas e tente novamente.'
  })

export const batchNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos esses lançamentos.',
    action: 'Atualize a página para ver os valores da turma.'
  })

export const batchAlreadyReversed = () =>
  new ValidationError({
    message: 'Esses lançamentos já foram desfeitos.',
    action: 'Atualize a página para ver os valores da turma.'
  })
