import { ValidationError } from '@/infra/errors'

export const notEnoughCoins = () =>
  new ValidationError({
    message: 'Você não tem moedas suficientes.',
    action: 'Junte mais moedas e tente novamente.'
  })
