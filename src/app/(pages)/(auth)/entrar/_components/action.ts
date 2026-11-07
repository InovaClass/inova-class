'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { EmailNotVerifiedError } from '@/models/authentication/errors'
import { authenticationModel } from '@/models/authentication/model'
import type { SignInInput } from '@/models/authentication/schema'

export type SignInState = FormState<SignInInput> & { resendTo?: string }

export const signIn = async (input: SignInInput): Promise<SignInState> => {
  let resendTo: string | undefined
  const state = await formAction(input, async (values) => {
    try {
      await authenticationModel.signIn(values, { headers: await headers() })
    } catch (error) {
      if (error instanceof EmailNotVerifiedError) resendTo = error.identifier
      throw error
    }
    redirect('/')
  })
  return { ...state, resendTo }
}
