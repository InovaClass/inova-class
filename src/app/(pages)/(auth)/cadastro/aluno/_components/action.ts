'use server'

import { headers } from 'next/headers'

import { formAction, type FormState, formSuccess } from '@/infra/form-action'
import { authenticationModel } from '@/models/authentication-model/model'
import type { StudentSignUpInput } from '@/models/authentication-model/schema'

type StudentSignUpState = FormState<StudentSignUpInput>

export const signUpStudent = async (
  _state: StudentSignUpState,
  formData: FormData
): Promise<StudentSignUpState> =>
  formAction(formData, async (input) => {
    const { email } = await authenticationModel.signUpStudent(input, {
      headers: await headers(),
      callbackURL: '/entrar'
    })
    return formSuccess(
      `Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.`
    )
  })
