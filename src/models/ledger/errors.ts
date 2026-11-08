import { NotFoundError, ValidationError } from '@/infra/errors'

export const notEnoughCoins = () =>
  new ValidationError({
    message: 'Você não tem moedas suficientes.',
    action: 'Junte mais moedas e tente novamente.'
  })

export const studentNotFallen = () =>
  new ValidationError({
    message: 'Esse aluno ainda tem HP.',
    action: 'Atualize a página para ver os valores da turma.'
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

export const entryNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos esse lançamento.',
    action: 'Atualize a página para ver o histórico da turma.'
  })

export const entryAlreadyReversed = () =>
  new ValidationError({
    message: 'Esse lançamento já foi revertido.',
    action: 'Atualize a página para ver o histórico da turma.'
  })

export const entryNotReversible = () =>
  new ValidationError({
    message: 'Esse lançamento não pode ser revertido.',
    action: 'Atualize a página para ver o histórico da turma.'
  })
