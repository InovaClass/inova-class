import { NotFoundError, ValidationError } from '@/infra/errors'

// Same answer for a submission of another class and one already decided, so the id reveals nothing
export const submissionNotFound = () =>
  new NotFoundError({
    message: 'Essa entrega não está mais pendente.',
    action: 'Atualize a página para ver as entregas.'
  })

export const objectiveLocked = () =>
  new ValidationError({
    message: 'Esse objetivo ainda está bloqueado.',
    action: 'Envie o objetivo anterior da missão primeiro.'
  })

export const objectiveAlreadySubmitted = () =>
  new ValidationError({
    message: 'Você já enviou esse objetivo.',
    action: 'Aguarde a resposta do professor.'
  })

export const missionNotPublished = () =>
  new ValidationError({
    message: 'Esta missão ainda é um rascunho.',
    action: 'Publique a missão antes de concluir objetivos.'
  })

export const studentAlreadySubmitted = () =>
  new ValidationError({
    message: 'Um dos alunos já tem uma entrega desse objetivo.',
    action: 'Atualize a página e selecione os alunos de novo.'
  })
