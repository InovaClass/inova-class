'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { authenticationModel } from '@/models/authentication/model'
import type { ResetPasswordInput } from '@/models/authentication/schema'

type ResetPasswordState = FormState<ResetPasswordInput>

export const resetPassword = async (
  token: string,
  input: ResetPasswordInput
): Promise<ResetPasswordState> =>
  formAction(input, async (values) => {
    await authenticationModel.resetPassword(values, {
      headers: await headers(),
      token
    })
    redirect('/entrar?senha=redefinida')
  })
