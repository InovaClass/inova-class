import { NotFoundError, ValidationError } from '@/infra/errors'

// Same answer for a class the student never joined, one they left and an archived one
export const enrollmentNotFound = () =>
  new NotFoundError({
    message: 'Você não está nesta turma.',
    action: 'Volte ao painel para ver as suas turmas.'
  })

export const characterAlreadyChosen = () =>
  new ValidationError({
    message: 'Você já escolheu o seu personagem nesta turma.',
    action: 'Atualize a página para mudar a aparência dele.'
  })

export const characterNotChosen = () =>
  new ValidationError({
    message: 'Você ainda não escolheu o seu personagem nesta turma.',
    action: 'Atualize a página para escolher.'
  })

export const characterClassChanged = () =>
  new ValidationError({
    message: 'O professor trocou a classe do seu personagem.',
    action: 'Atualize a página para ver a nova classe.'
  })
