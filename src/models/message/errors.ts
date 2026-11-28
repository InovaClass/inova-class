import {
  NotFoundError,
  TooManyRequestsError,
  ValidationError
} from '@/infra/errors'

export const boardClosed = () =>
  new ValidationError({
    message: 'O mural desta turma está fechado.',
    action: 'Fale com o professor da turma.'
  })

export const studentMuted = () =>
  new ValidationError({
    message: 'O professor silenciou você nas mensagens da turma.',
    action: 'Você ainda pode ler as mensagens.'
  })

export const discussionClosed = () =>
  new ValidationError({
    message: 'A discussão deste objetivo está fechada.',
    action: 'As mensagens enviadas continuam visíveis.'
  })

export const tooManyMessages = () =>
  new TooManyRequestsError({
    message: 'Você enviou muitas mensagens seguidas.',
    action: 'Espere um minuto e tente de novo.'
  })

export const messageNotFound = () =>
  new NotFoundError({
    message: 'Essa mensagem não está mais aqui.',
    action: 'Atualize a página para ver as mensagens.'
  })
