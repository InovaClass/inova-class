import { setTimeout } from 'node:timers/promises'

import { isAPIError } from 'better-auth/api'

import type { UserRole } from '@/constants/user'
import { auth, withSignUpRole } from '@/infra/auth'
import { studentModel } from '@/models/student/model'
import { authenticationRepo } from '@/repositories/authentication-repo'

import { VERIFICATION_RESEND_COOLDOWN_SECONDS } from './constants'
import {
  EmailNotVerifiedError,
  toAppError,
  toFieldError,
  VerificationResendCooldownError
} from './errors'
import {
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  studentSignUpSchema
} from './schema'

// Better Auth reads the host (dynamic baseURL), the IP (rate limiting) and the cookies from the
// request, so every call takes its headers; passing them in keeps the model testable outside Next
type RequestContext = { headers: Headers }

// Codes without a user-facing message stay unexpected errors
const translateError = (error: unknown) => {
  if (!isAPIError(error)) return error
  const code = error.body?.code
  return toFieldError(code) || toAppError(code, error) || error
}

const translateErrors = async <T>(request: Promise<T>): Promise<T> => {
  try {
    return await request
  } catch (error) {
    throw translateError(error)
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
  await authenticationRepo.recordVerificationSent(
    email.toLowerCase(),
    new Date()
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
  await authenticationRepo.recordVerificationSent(
    email.toLowerCase(),
    new Date()
  )
  return { name, username, email }
}

// A username can't contain `@` (USERNAME_PATTERN), so it tells the two apart
const signIn = async (input: unknown, { headers }: RequestContext) => {
  const { identifier, password } = signInSchema.parse(input)
  const request = identifier.includes('@')
    ? auth.api.signInEmail({ body: { email: identifier, password }, headers })
    : auth.api.signInUsername({
        body: { username: identifier, password },
        headers
      })
  try {
    await request
  } catch (error) {
    if (!isAPIError(error) || error.body?.code !== 'EMAIL_NOT_VERIFIED') {
      throw translateError(error)
    }
    // `sendOnSignIn` just sent a new link, so the resend cooldown starts now
    const { identifier: key } = resendVerificationSchema.parse({ identifier })
    await authenticationRepo.recordVerificationSent(key, new Date())
    throw new EmailNotVerifiedError(key, error)
  }
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

// Better Auth's own floor for this send (`/send-verification-email`), applied to the invite too so
// the response time doesn't tell a pending student apart
const RESEND_MINIMUM_MS = 500

const resendVerificationEmail = async (
  input: unknown,
  { headers, callbackURL }: RequestContext & { callbackURL: string }
) => {
  const { identifier } = resendVerificationSchema.parse(input)
  const now = new Date()
  const cooldownInMs = VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000
  const sentAt = await authenticationRepo.claimVerificationResend(identifier, {
    now,
    cooldownEndedSince: new Date(now.getTime() - cooldownInMs)
  })
  if (sentAt.getTime() !== now.getTime()) {
    const remainingInMs = sentAt.getTime() + cooldownInMs - now.getTime()
    throw new VerificationResendCooldownError(Math.ceil(remainingInMs / 1000))
  }

  const email = identifier.includes('@')
    ? identifier
    : await authenticationRepo.findEmailByUsername(identifier)
  const minimumDuration = setTimeout(RESEND_MINIMUM_MS)
  // A verification link signs a pending student in, which would skip the terms acceptance of the
  // invite page (#10)
  if (email && !(await studentModel.resendInvite(email, { headers }))) {
    // Without a session the endpoint answers the same for every email; a session of another
    // account would make it reject this one instead
    const withoutSession = new Headers(headers)
    withoutSession.delete('cookie')
    await translateErrors(
      auth.api.sendVerificationEmail({
        body: { email, callbackURL },
        headers: withoutSession
      })
    )
  }
  await minimumDuration
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
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword
}
