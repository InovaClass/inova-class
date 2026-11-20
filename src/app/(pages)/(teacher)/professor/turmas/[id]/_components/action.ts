'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { accountModel } from '@/models/account/model'
import { behaviorModel } from '@/models/behavior/model'
import { CHARACTER_CLASS_NAMES } from '@/models/character/constants'
import { characterModel } from '@/models/character/model'
import type { CharacterClassInput } from '@/models/character/schema'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'

export const archiveClass = async (classId: string): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await classModel.archive(user.id, classId)
    revalidatePath('/professor', 'layout')
    redirect('/professor')
  })

export const regenerateJoinCode = async (classId: string): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await classModel.regenerateJoinCode(user.id, classId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Novo código gerado.')
  })

export const setJoinCodeEnabled = async (
  classId: string,
  enabled: boolean
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await classModel.setJoinCodeEnabled(user.id, classId, enabled)
    revalidatePath('/professor', 'layout')
    return formSuccess(enabled ? 'Código ativado.' : 'Código desativado.')
  })

export const removeStudent = async (
  classId: string,
  studentId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await enrollmentModel.remove(user.id, classId, studentId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Aluno removido da turma.')
  })

export const deleteStudentAccount = async (
  classId: string,
  studentId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await accountModel.deleteInvitedStudent(user.id, classId, studentId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Conta do aluno excluída.')
  })

export const changeCharacterClass = async (
  classId: string,
  studentId: string,
  input: CharacterClassInput
): Promise<FormState> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    await characterModel.changeCharacterClass(
      user.id,
      classId,
      studentId,
      values
    )
    revalidatePath('/professor', 'layout')
    return formSuccess(
      `Classe trocada para ${CHARACTER_CLASS_NAMES[values.characterClass]}.`
    )
  })

export const awardBehavior = async (
  classId: string,
  behaviorId: string,
  studentIds: string[]
): Promise<{ state: FormState; batchId?: string }> => {
  let batchId: string | undefined
  const state = await formAction({}, async () => {
    const { user } = await requireRole('teacher')
    const award = await behaviorModel.award(
      user.id,
      classId,
      behaviorId,
      studentIds
    )
    batchId = award.batchId
    revalidatePath('/professor', 'layout')
    return formSuccess(
      `${award.behaviorName}: aplicado a ${award.studentCount} ${award.studentCount === 1 ? 'aluno' : 'alunos'}.`
    )
  })
  return { state, batchId }
}

export const undoAward = async (
  classId: string,
  batchId: string
): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireRole('teacher')
    await behaviorModel.undoAward(user.id, classId, batchId)
    revalidatePath('/professor', 'layout')
    return formSuccess('Aplicação desfeita.')
  })
