'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/infra/form-action'
import { authenticationModel } from '@/models/authentication-model/model'
import type { ResetPasswordInput } from '@/models/authentication-model/schema'

type ResetPasswordState = FormState<ResetPasswordInput>

export const resetPassword = async (
  token: string,
  _state: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> =>
  formAction(formData, async (input) => {
    await authenticationModel.resetPassword(input, {
      headers: await headers(),
      token
    })
    redirect('/entrar?senha=redefinida')
  })
