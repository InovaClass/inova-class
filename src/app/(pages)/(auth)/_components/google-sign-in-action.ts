'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import type { UserRole } from '@/constants/user'
import { formAction, type FormState } from '@/infra/form-action'
import { authenticationModel } from '@/models/authentication-model/model'

export type GoogleSignInState = FormState<never>

const continueWithGoogle = async (
  formData: FormData,
  { signUpRole, returnPath }: { signUpRole?: UserRole; returnPath: string }
): Promise<GoogleSignInState> =>
  formAction(formData, async () => {
    const url = await authenticationModel.signInWithGoogle({
      headers: await headers(),
      signUpRole,
      // `?error=` also comes from email links, which need different copy
      errorCallbackURL: `${returnPath}?origem=google`
    })
    redirect(url)
  })

export const signInWithGoogle = async (
  _state: GoogleSignInState,
  formData: FormData
) => continueWithGoogle(formData, { returnPath: '/entrar' })

export const signUpTeacherWithGoogle = async (
  _state: GoogleSignInState,
  formData: FormData
) =>
  continueWithGoogle(formData, {
    signUpRole: 'teacher',
    returnPath: '/cadastro/professor'
  })

export const signUpStudentWithGoogle = async (
  _state: GoogleSignInState,
  formData: FormData
) =>
  continueWithGoogle(formData, {
    signUpRole: 'student',
    returnPath: '/cadastro/aluno'
  })
