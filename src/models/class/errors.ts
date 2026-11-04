import { NotFoundError } from '@/infra/errors'

// Same answer for a class of another teacher and an archived one, so the id reveals nothing
export const classNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos essa turma.',
    action: 'Volte ao painel e escolha uma das suas turmas.'
  })
