import { NotFoundError } from '@/infra/errors'

// Same answer for a power of another teacher's class and a removed one, so the id reveals nothing
export const powerNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos esse poder.',
    action: 'Volte à lista de poderes da turma.'
  })
