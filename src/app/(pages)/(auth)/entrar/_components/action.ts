'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/infra/form-action'
import { authenticationModel } from '@/models/authentication-model/model'
import type { SignInInput } from '@/models/authentication-model/schema'

export type SignInState = FormState<SignInInput>

export const signIn = async (
  _state: SignInState,
  formData: FormData
): Promise<SignInState> =>
  formAction(formData, async (input) => {
    const { mustChangePassword } = await authenticationModel.signIn(input, {
      headers: await headers()
    })
    redirect(mustChangePassword ? '/alterar-senha' : '/')
  })
