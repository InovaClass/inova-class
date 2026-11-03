'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { authenticationModel } from '@/models/authentication/model'
import type { SignInInput } from '@/models/authentication/schema'

export type SignInState = FormState<SignInInput>

export const signIn = async (input: SignInInput): Promise<SignInState> =>
  formAction(input, async (values) => {
    const { mustChangePassword } = await authenticationModel.signIn(values, {
      headers: await headers()
    })
    redirect(mustChangePassword ? '/alterar-senha' : '/')
  })
