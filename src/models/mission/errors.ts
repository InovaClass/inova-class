import { z } from 'zod'

import { NotFoundError, ValidationError } from '@/infra/errors'

// Same answer for a mission of another teacher's class and a removed one, so the id reveals nothing
export const missionNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos essa missão.',
    action: 'Volte à lista de missões da turma.'
  })

export const objectiveNotFound = () =>
  new NotFoundError({
    message: 'Não encontramos esse objetivo.',
    action: 'Volte à missão para ver os objetivos.'
  })

export const missionAlreadyPublished = () =>
  new ValidationError({
    message: 'Esta missão já foi publicada.',
    action: 'Recarregue a página para ver a missão atualizada.'
  })

export const missionWithoutObjectives = () =>
  new ValidationError({
    message: 'A missão ainda não tem objetivos.',
    action: 'Crie pelo menos um objetivo antes de publicar.'
  })

export const lastObjectiveOfPublishedMission = () =>
  new ValidationError({
    message: 'Uma missão publicada precisa de pelo menos um objetivo.',
    action: 'Crie outro objetivo antes de remover este.'
  })

// Same answer for another teacher's class, an archived one and the class of the mission itself, so
// the id reveals nothing
export const targetClassNotFound = () =>
  new z.ZodError([
    {
      code: 'custom',
      path: ['targetClassId'],
      message: 'Escolha outra das suas turmas ativas.',
      input: undefined
    }
  ])
