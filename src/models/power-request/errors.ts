import { NotFoundError, ValidationError } from '@/infra/errors'

export const powerLocked = () =>
  new ValidationError({
    message: 'Esse poder ainda está bloqueado.',
    action: 'Suba de nível para usar esse poder.'
  })

export const powerAlreadyRequested = () =>
  new ValidationError({
    message: 'Você já pediu esse poder.',
    action: 'Aguarde a resposta do professor.'
  })

export const notEnoughAvailableCoins = () =>
  new ValidationError({
    message: 'Você não tem moedas disponíveis suficientes.',
    action: 'Junte mais moedas ou cancele um pedido pendente.'
  })

// Same answer for a request of another class and one already decided, so the id reveals nothing
export const requestNotFound = () =>
  new NotFoundError({
    message: 'Esse pedido não está mais pendente.',
    action: 'Atualize a página para ver os pedidos.'
  })
