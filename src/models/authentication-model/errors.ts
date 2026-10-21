import { UnauthorizedError, ValidationError } from '@/infra/errors'

type AuthErrorCopy = {
  kind: 'validation' | 'unauthorized'
  message: string
  action: string
}

const INVALID_LINK: AuthErrorCopy = {
  kind: 'validation',
  message: 'Este link é inválido ou expirou.',
  action: 'Peça um novo link.'
}

// Better Auth error codes we expect, also received as `?error=` when an email link fails
const AUTH_ERRORS: Record<string, AuthErrorCopy> = {
  INVALID_EMAIL_OR_PASSWORD: {
    kind: 'unauthorized',
    message: 'E-mail ou senha incorretos.',
    action: 'Confira os dados e tente novamente.'
  },
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

export const toAppError = (code: string | undefined, cause: unknown) => {
  const copy = code ? AUTH_ERRORS[code] : undefined
  if (!copy) return
  const ErrorClass =
    copy.kind === 'unauthorized' ? UnauthorizedError : ValidationError
  return new ErrorClass({ message: copy.message, action: copy.action, cause })
}
