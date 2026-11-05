import { NotFoundError, TooManyRequestsError } from '@/infra/errors'

export const studentNotInClass = () =>
  new NotFoundError({
    message: 'Esse aluno não está mais nesta turma.',
    action: 'Atualize a página para ver a lista de alunos.'
  })

export const tooManyJoinAttempts = (minutes: number) =>
  new TooManyRequestsError({
    message: 'Muitas tentativas com códigos inválidos.',
    action: `Tente de novo em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
  })
