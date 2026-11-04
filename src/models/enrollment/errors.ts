import { NotFoundError } from '@/infra/errors'

export const studentNotInClass = () =>
  new NotFoundError({
    message: 'Esse aluno não está mais nesta turma.',
    action: 'Atualize a página para ver a lista de alunos.'
  })
