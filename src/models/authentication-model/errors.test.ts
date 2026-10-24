import { describe, expect, test } from 'vitest'

import { UnauthorizedError, ValidationError } from '@/infra/errors'
import {
  authErrorFromCode,
  googleErrorFromCode,
  toAppError
} from '@/models/authentication-model/errors'

describe('authErrorFromCode', () => {
  test('returns the message and action of a known code', () => {
    expect(authErrorFromCode('TOKEN_EXPIRED')).toEqual({
      message: 'Este link é inválido ou expirou.',
      action: 'Peça um novo link.'
    })
  })

  test('treats an unknown or missing code as an invalid link', () => {
    expect(authErrorFromCode('SOMETHING_ELSE')).toEqual(
      authErrorFromCode('INVALID_TOKEN')
    )
    expect(authErrorFromCode(undefined)).toEqual(
      authErrorFromCode('INVALID_TOKEN')
    )
  })
})

describe('googleErrorFromCode', () => {
  test('returns the message and action of a known code', () => {
    expect(googleErrorFromCode('signup_disabled')).toEqual({
      message: 'Não encontramos uma conta para este e-mail do Google.',
      action: 'Crie uma conta para continuar.'
    })
  })

  test('treats an unknown code as a failed Google sign-in', () => {
    expect(googleErrorFromCode('invalid_code')).toEqual({
      message: 'Não foi possível continuar com o Google.',
      action: 'Tente novamente em instantes.'
    })
  })
})

describe('toAppError', () => {
  test('maps credential errors to UnauthorizedError', () => {
    const error = toAppError('INVALID_EMAIL_OR_PASSWORD', undefined)
    expect(error).toBeInstanceOf(UnauthorizedError)
    expect(error?.message).toBe('E-mail ou senha incorretos.')
  })

  test('maps link errors to ValidationError', () => {
    expect(toAppError('INVALID_TOKEN', undefined)).toBeInstanceOf(
      ValidationError
    )
  })

  test('leaves codes without a message to the caller', () => {
    expect(toAppError('SOMETHING_ELSE', undefined)).toBeUndefined()
  })
})
