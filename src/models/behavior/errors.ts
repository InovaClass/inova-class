import { NotFoundError } from '@/infra/errors'

// Same answer for a behavior of another teacher's class and a removed one, so the id reveals nothing
export const behaviorNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos esse comportamento.',
    action: 'Volte à lista de comportamentos da turma.'
  })
