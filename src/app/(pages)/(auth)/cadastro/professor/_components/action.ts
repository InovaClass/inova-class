'use server'

import { headers } from 'next/headers'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { authenticationModel } from '@/models/authentication/model'
import type { SignUpInput } from '@/models/authentication/schema'

type SignUpState = FormState<SignUpInput> & { resendTo?: string }

export const signUp = async (input: SignUpInput): Promise<SignUpState> => {
  let resendTo: string | undefined
  const state = await formAction(input, async (values) => {
    const { email } = await authenticationModel.signUp(values, {
      headers: await headers(),
      callbackURL: '/entrar'
    })
    resendTo = email
    return formSuccess(
      `Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.`
    )
  })
  return { ...state, resendTo }
}
