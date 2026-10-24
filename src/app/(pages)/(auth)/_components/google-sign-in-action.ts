'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/infra/form-action'
import { authenticationModel } from '@/models/authentication-model/model'

export type GoogleSignInState = FormState<never>

const continueWithGoogle = async (
  formData: FormData,
  { requestSignUp, returnPath }: { requestSignUp: boolean; returnPath: string }
): Promise<GoogleSignInState> =>
  formAction(formData, async () => {
    const url = await authenticationModel.signInWithGoogle({
      headers: await headers(),
      requestSignUp,
      // `?error=` also comes from email links, which need different copy
      errorCallbackURL: `${returnPath}?origem=google`
    })
    redirect(url)
  })

export const signInWithGoogle = async (
  _state: GoogleSignInState,
  formData: FormData
) =>
  continueWithGoogle(formData, { requestSignUp: false, returnPath: '/entrar' })

export const signUpWithGoogle = async (
  _state: GoogleSignInState,
  formData: FormData
) =>
  continueWithGoogle(formData, { requestSignUp: true, returnPath: '/cadastro' })
