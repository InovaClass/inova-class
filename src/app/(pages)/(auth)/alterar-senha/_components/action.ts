'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { authenticationModel } from '@/models/authentication/model'
import type { ChangePasswordInput } from '@/models/authentication/schema'

type ChangePasswordState = FormState<ChangePasswordInput>

export const changePassword = async (
  input: ChangePasswordInput
): Promise<ChangePasswordState> =>
  formAction(input, async (values) => {
    await authenticationModel.changePassword(values, {
      headers: await headers()
    })
    redirect('/')
  })
