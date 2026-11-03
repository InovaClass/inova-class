'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { requireRole } from '@/entry/session'
import { studentModel } from '@/models/student/model'
import type { InviteStudentsInput } from '@/models/student/schema'

export const inviteStudents = async (
  classId: string,
  input: InviteStudentsInput
): Promise<FormState<InviteStudentsInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireRole('teacher')
    const { count } = await studentModel.invite(user.id, classId, values, {
      headers: await headers()
    })
    revalidatePath('/professor', 'layout')
    return formSuccess(
      `Lista recebida com ${count === 1 ? '1 aluno' : `${count} alunos`}. Quem ainda não tem conta receberá um convite por e-mail, e quem já tem será avisado.`
    )
  })
