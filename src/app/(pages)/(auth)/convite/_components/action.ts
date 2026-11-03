'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import type { AcceptInviteInput } from '@/models/authentication/schema'
import { studentModel } from '@/models/student/model'

export const acceptInvite = async (
  token: string,
  input: AcceptInviteInput
): Promise<FormState<AcceptInviteInput>> =>
  formAction(input, async (values) => {
    await studentModel.acceptInvite(values, {
      headers: await headers(),
      token
    })
    redirect('/')
  })
