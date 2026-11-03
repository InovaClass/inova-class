'use server'

import { headers } from 'next/headers'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { authenticationModel } from '@/models/authentication/model'
import type { StudentSignUpInput } from '@/models/authentication/schema'

type StudentSignUpState = FormState<StudentSignUpInput>

export const signUpStudent = async (
  input: StudentSignUpInput
): Promise<StudentSignUpState> =>
  formAction(input, async (values) => {
    const { email } = await authenticationModel.signUpStudent(values, {
      headers: await headers(),
      callbackURL: '/entrar'
    })
    return formSuccess(
      `Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.`
    )
  })
