import { NotFoundError } from '@/infra/errors'

// Same answer for an order of another class and one already decided, so the id reveals nothing
export const orderNotFound = () =>
  new NotFoundError({
    message: 'Esse pedido não está mais pendente.',
    action: 'Atualize a página para ver os pedidos.'
  })
