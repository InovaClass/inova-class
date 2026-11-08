import { NotFoundError, ValidationError } from '@/infra/errors'

// Same answer for a consequence of another teacher's class and a removed one, so the id reveals nothing
export const consequenceNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos essa consequência.',
    action: 'Volte à lista de consequências da turma.'
  })

export const noConsequencesToDraw = () =>
  new ValidationError({
    message: 'Esta turma não tem consequências para sortear.',
    action: 'Cadastre uma consequência e tente novamente.'
  })
