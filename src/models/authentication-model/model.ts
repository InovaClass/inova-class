import { isAPIError } from 'better-auth/api'

import { auth } from '@/infra/auth'
import { toAppError } from '@/models/authentication-model/errors'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema
} from '@/models/authentication-model/schema'

// Better Auth reads the host (dynamic baseURL), the IP (rate limiting) and the cookies from the
// request, so every call takes its headers; passing them in keeps the model testable outside Next
type RequestContext = { headers: Headers }

const translateErrors = async <T>(request: Promise<T>): Promise<T> => {
  try {
    return await request
  } catch (error) {
    // Codes without a user-facing message stay unexpected errors
    throw (isAPIError(error) && toAppError(error.body?.code, error)) || error
  }
}

const signUp = async (
  input: unknown,
  { headers, callbackURL }: RequestContext & { callbackURL: string }
) => {
  const { name, email, password } = signUpSchema.parse(input)
  await translateErrors(
    auth.api.signUpEmail({
      body: { name, email, password, callbackURL },
      headers
    })
  )
  return { name, email }
}

const signIn = async (input: unknown, { headers }: RequestContext) => {
  const data = signInSchema.parse(input)
  return translateErrors(auth.api.signInEmail({ body: data, headers }))
}

const requestPasswordReset = async (
  input: unknown,
  { headers, redirectTo }: RequestContext & { redirectTo: string }
) => {
  const data = forgotPasswordSchema.parse(input)
  await translateErrors(
    auth.api.requestPasswordReset({
      body: { email: data.email, redirectTo },
      headers
    })
  )
  return data
}

const resetPassword = async (
  input: unknown,
  { headers, token }: RequestContext & { token: string }
) => {
  const { password } = resetPasswordSchema.parse(input)
  await translateErrors(
    auth.api.resetPassword({ body: { token, newPassword: password }, headers })
  )
}

export const authenticationModel = {
  signUp,
  signIn,
  requestPasswordReset,
  resetPassword
}
