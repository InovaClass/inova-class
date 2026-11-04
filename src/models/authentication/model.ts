import { isAPIError } from 'better-auth/api'

import type { UserRole } from '@/constants/user'
import { auth, withSignUpRole } from '@/infra/auth'
import { studentModel } from '@/models/student/model'

import { toAppError, toFieldError } from './errors'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  studentSignUpSchema
} from './schema'

// Better Auth reads the host (dynamic baseURL), the IP (rate limiting) and the cookies from the
// request, so every call takes its headers; passing them in keeps the model testable outside Next
type RequestContext = { headers: Headers }

const translateErrors = async <T>(request: Promise<T>): Promise<T> => {
  try {
    return await request
  } catch (error) {
    // Codes without a user-facing message stay unexpected errors
    if (!isAPIError(error)) throw error
    const code = error.body?.code
    throw toFieldError(code) || toAppError(code, error) || error
  }
}

const signUp = async (
  input: unknown,
  { headers, callbackURL }: RequestContext & { callbackURL: string }
) => {
  const { name, email, password } = signUpSchema.parse(input)
  await translateErrors(
    withSignUpRole('teacher', () =>
      auth.api.signUpEmail({
        body: { name, email, password, callbackURL },
        headers
      })
    )
  )
  return { name, email }
}

const signUpStudent = async (
  input: unknown,
  { headers, callbackURL }: RequestContext & { callbackURL: string }
) => {
  const { name, username, email, password } = studentSignUpSchema.parse(input)
  await translateErrors(
    withSignUpRole('student', () =>
      auth.api.signUpEmail({
        body: { name, username, email, password, callbackURL },
        headers
      })
    )
  )
  return { name, username, email }
}

// A username can't contain `@` (USERNAME_PATTERN), so it tells the two apart
const signIn = async (input: unknown, { headers }: RequestContext) => {
  const { identifier, password } = signInSchema.parse(input)
  await translateErrors<unknown>(
    identifier.includes('@')
      ? auth.api.signInEmail({ body: { email: identifier, password }, headers })
      : auth.api.signInUsername({
          body: { username: identifier, password },
          headers
        })
  )
}

const signInWithGoogle = async ({
  headers,
  errorCallbackURL,
  signUpRole
}: RequestContext & {
  errorCallbackURL: string
  // Only a sign-up page passes it; signing in never creates an account
  signUpRole?: UserRole
}) => {
  const request = () =>
    auth.api.signInSocial({
      body: {
        provider: 'google',
        callbackURL: '/',
        errorCallbackURL,
        requestSignUp: Boolean(signUpRole)
      },
      headers
    })
  const { url } = await translateErrors(
    signUpRole ? withSignUpRole(signUpRole, request) : request()
  )
  if (!url) throw new Error('Google sign-in returned no authorization URL')
  return url
}

const requestPasswordReset = async (
  input: unknown,
  { headers, redirectTo }: RequestContext & { redirectTo: string }
) => {
  const data = forgotPasswordSchema.parse(input)
  // A password set here would skip the terms acceptance of the invite page (#10)
  if (await studentModel.resendInvite(data.email, { headers })) return data
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

const signOut = async ({ headers }: RequestContext) => {
  await translateErrors(auth.api.signOut({ headers }))
}

export const authenticationModel = {
  signUp,
  signUpStudent,
  signIn,
  signInWithGoogle,
  signOut,
  requestPasswordReset,
  resetPassword
}
