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
    message: 'O professor silenciou você neste mural.',
    action: 'Você ainda pode ler as mensagens da turma.'
  })

export const tooManyMessages = () =>
  new TooManyRequestsError({
    message: 'Você enviou muitas mensagens seguidas.',
    action: 'Espere um minuto e tente de novo.'
  })

export const messageNotFound = () =>
  new NotFoundError({
    message: 'Essa mensagem não está mais no mural.',
    action: 'Atualize a página para ver as mensagens.'
  })
