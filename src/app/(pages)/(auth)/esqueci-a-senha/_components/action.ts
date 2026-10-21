'use server'

import { headers } from 'next/headers'

import { formAction, type FormState, formSuccess } from '@/infra/form-action'
import { authenticationModel } from '@/models/authentication-model/model'
import type { ForgotPasswordInput } from '@/models/authentication-model/schema'

type ForgotPasswordState = FormState<ForgotPasswordInput>

export const requestPasswordReset = async (
  _state: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> =>
  formAction(formData, async (input) => {
    const { email } = await authenticationModel.requestPasswordReset(input, {
      headers: await headers(),
      redirectTo: '/redefinir-senha'
    })
    return formSuccess(
      `Se houver uma conta para ${email}, enviamos um link para redefinir a senha.`
    )
  })
