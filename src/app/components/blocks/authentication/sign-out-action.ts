'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { authenticationModel } from '@/models/authentication/model'

export type SignOutState = FormState<never>

export const signOut = async (): Promise<SignOutState> =>
  formAction(undefined, async () => {
    await authenticationModel.signOut({ headers: await headers() })
    redirect('/entrar')
  })
