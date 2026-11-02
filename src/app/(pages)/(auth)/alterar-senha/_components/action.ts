'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { authenticationModel } from '@/models/authentication/model'
import type { ChangePasswordInput } from '@/models/authentication/schema'

type ChangePasswordState = FormState<ChangePasswordInput>

export const changePassword = async (
  _state: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> =>
  formAction(formData, async (input) => {
    await authenticationModel.changePassword(input, {
      headers: await headers()
    })
    redirect('/')
  })
