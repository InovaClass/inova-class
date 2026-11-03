'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import type { UserRole } from '@/constants/user'
import { formAction, type FormState } from '@/entry/form-action'
import { authenticationModel } from '@/models/authentication/model'

export type GoogleSignInState = FormState<never>

const continueWithGoogle = async ({
  signUpRole,
  returnPath
}: {
  signUpRole?: UserRole
  returnPath: string
}): Promise<GoogleSignInState> =>
  formAction(undefined, async () => {
    const url = await authenticationModel.signInWithGoogle({
      headers: await headers(),
      signUpRole,
      // `?error=` also comes from email links, which need different copy
      errorCallbackURL: `${returnPath}?origem=google`
    })
    redirect(url)
  })

export const signInWithGoogle = async () =>
  continueWithGoogle({ returnPath: '/entrar' })

export const signUpTeacherWithGoogle = async () =>
  continueWithGoogle({
    signUpRole: 'teacher',
    returnPath: '/cadastro/professor'
  })

export const signUpStudentWithGoogle = async () =>
  continueWithGoogle({
    signUpRole: 'student',
    returnPath: '/cadastro/aluno'
  })
