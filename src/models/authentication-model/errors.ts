import { z } from 'zod'

import { UnauthorizedError, ValidationError } from '@/infra/errors'

type ErrorCopy = { message: string; action: string }

type AuthErrorCopy = ErrorCopy & { kind: 'validation' | 'unauthorized' }

const INVALID_LINK: AuthErrorCopy = {
  kind: 'validation',
  message: 'Este link é inválido ou expirou.',
  action: 'Peça um novo link.'
}

// One copy for every way a sign-in can fail, so it doesn't tell which part was wrong
const INVALID_CREDENTIALS: AuthErrorCopy = {
  kind: 'unauthorized',
  message: 'E-mail, usuário ou senha incorretos.',
  action: 'Confira os dados e tente novamente.'
}

// Better Auth error codes we expect, also received as `?error=` when an email link fails
const AUTH_ERRORS: Record<string, AuthErrorCopy> = {
  INVALID_EMAIL_OR_PASSWORD: INVALID_CREDENTIALS,
  INVALID_USERNAME_OR_PASSWORD: INVALID_CREDENTIALS,
  // The sign-in field accepts any username, so the plugin's own length and character checks
  // only ever reject one that can't exist
  USERNAME_TOO_SHORT: INVALID_CREDENTIALS,
  USERNAME_TOO_LONG: INVALID_CREDENTIALS,
  INVALID_USERNAME: INVALID_CREDENTIALS,
  EMAIL_NOT_VERIFIED: {
    kind: 'unauthorized',
    message: 'Confirme seu e-mail antes de entrar.',
    action: 'Abra o novo link que enviamos para seu e-mail.'
  },
  INVALID_TOKEN: INVALID_LINK,
  TOKEN_EXPIRED: INVALID_LINK
}

export const authErrorFromCode = (code: string | undefined) => {
  const copy = (code && AUTH_ERRORS[code]) || INVALID_LINK
  return { message: copy.message, action: copy.action }
}

const GOOGLE_FAILED: ErrorCopy = {
  message: 'Não foi possível continuar com o Google.',
  action: 'Tente novamente em instantes.'
}

// OAuth callback codes we expect, received as `?error=` when signing in with Google fails
const GOOGLE_ERRORS: Record<string, ErrorCopy> = {
  // Linking needs the email verified on both sides:
  // https://www.better-auth.com/docs/concepts/users-accounts#account-linking
  account_not_linked: {
    message: 'Já existe uma conta com este e-mail.',
    action: 'Entre com seu e-mail e senha para usar esta conta.'
  },
  signup_disabled: {
    message: 'Não encontramos uma conta para este e-mail do Google.',
    action: 'Crie uma conta para continuar.'
  },
  access_denied: {
    message: 'O acesso com o Google foi cancelado.',
    action: 'Tente novamente ou use seu e-mail e senha.'
  }
}

export const googleErrorFromCode = (code: string): ErrorCopy =>
  GOOGLE_ERRORS[code] || GOOGLE_FAILED

// Codes that belong to a single field, shown next to it
const FIELD_ERRORS: Record<string, { field: string; message: string }> = {
  USERNAME_IS_ALREADY_TAKEN: {
    field: 'username',
    message: 'Este nome de usuário já está em uso.'
  }
}

export const toFieldError = (code: string | undefined) => {
  const copy = code ? FIELD_ERRORS[code] : undefined
  if (!copy) return
  return new z.ZodError([
    {
      code: 'custom',
      path: [copy.field],
      message: copy.message,
      input: undefined
    }
  ])
}

export const toAppError = (code: string | undefined, cause: unknown) => {
  const copy = code ? AUTH_ERRORS[code] : undefined
  if (!copy) return
  const ErrorClass =
    copy.kind === 'unauthorized' ? UnauthorizedError : ValidationError
  return new ErrorClass({ message: copy.message, action: copy.action, cause })
}
