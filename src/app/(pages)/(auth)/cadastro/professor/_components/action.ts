'use server'

import { headers } from 'next/headers'

import { formAction, type FormState, formSuccess } from '@/infra/form-action'
import { authenticationModel } from '@/models/authentication-model/model'
import type { SignUpInput } from '@/models/authentication-model/schema'

type SignUpState = FormState<SignUpInput>

export const signUp = async (
  _state: SignUpState,
  formData: FormData
): Promise<SignUpState> =>
  formAction(formData, async (input) => {
    const { email } = await authenticationModel.signUp(input, {
      headers: await headers(),
      callbackURL: '/entrar'
    })
    return formSuccess(
      `Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.`
    )
  })
