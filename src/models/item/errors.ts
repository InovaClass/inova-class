import { NotFoundError, ValidationError } from '@/infra/errors'

export const itemNotFound = () =>
  new NotFoundError({
    message: 'Esse item não existe.',
    action: 'Atualize a página para ver os itens.'
  })

export const itemShopDisabled = () =>
  new ValidationError({
    message: 'O professor fechou a loja de itens nesta turma.',
    action: 'Você ainda pode usar os itens que já tem.'
  })

export const itemAlreadyOwned = () =>
  new ValidationError({
    message: 'Você já tem esse item.',
    action: 'Equipe o item na lista de itens.'
  })

export const itemNotOwned = () =>
  new ValidationError({
    message: 'Você ainda não tem esse item.',
    action: 'Compre o item antes de equipar.'
  })

export const itemLocked = () =>
  new ValidationError({
    message: 'Esse item ainda está bloqueado nesta turma.',
    action: 'Suba de nível para usar esse item.'
  })

export const itemOfAnotherCharacterClass = () =>
  new ValidationError({
    message: 'Esse item é de outra classe de personagem.',
    action: 'Escolha um item da sua classe.'
  })
