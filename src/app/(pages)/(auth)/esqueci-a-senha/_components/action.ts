'use server'

import { headers } from 'next/headers'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { authenticationModel } from '@/models/authentication/model'
import type { ForgotPasswordInput } from '@/models/authentication/schema'

type ForgotPasswordState = FormState<ForgotPasswordInput>

export const requestPasswordReset = async (
  input: ForgotPasswordInput
): Promise<ForgotPasswordState> =>
  formAction(input, async (values) => {
    const { email } = await authenticationModel.requestPasswordReset(values, {
      headers: await headers(),
      redirectTo: '/redefinir-senha'
    })
    return formSuccess(
      `Se houver uma conta para ${email}, enviamos um link para redefinir a senha.`
    )
  })
