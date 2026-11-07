'use server'

import { headers } from 'next/headers'

import { formAction, type FormState, formSuccess } from '@/entry/form-action'
import { VERIFICATION_RESEND_COOLDOWN_SECONDS } from '@/models/authentication/constants'
import { VerificationResendCooldownError } from '@/models/authentication/errors'
import { authenticationModel } from '@/models/authentication/model'
import type { ResendVerificationInput } from '@/models/authentication/schema'

// The server's cooldown wins over the button's, e.g. after a send from another tab
export type ResendVerificationState = FormState<ResendVerificationInput> & {
  retryInSeconds?: number
}

export const resendVerificationEmail = async (
  input: ResendVerificationInput
): Promise<ResendVerificationState> => {
  let retryInSeconds: number | undefined
  const state = await formAction(input, async (values) => {
    try {
      await authenticationModel.resendVerificationEmail(values, {
        headers: await headers(),
        callbackURL: '/entrar'
      })
    } catch (error) {
      if (error instanceof VerificationResendCooldownError) {
        retryInSeconds = error.retryInSeconds
      }
      throw error
    }
    retryInSeconds = VERIFICATION_RESEND_COOLDOWN_SECONDS
    return formSuccess('Enviamos um novo link. Confira também a caixa de spam.')
  })
  return { ...state, retryInSeconds }
}
