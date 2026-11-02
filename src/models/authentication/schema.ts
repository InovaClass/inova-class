import { z } from 'zod'

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN
} from '@/constants/user'

// Imported by the client forms too, so it must not import anything server-only

const email = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail.')
  .pipe(z.email('Informe um e-mail válido.'))

const name = z
  .string()
  .trim()
  .min(1, 'Informe seu nome.')
  .max(100, 'O nome pode ter no máximo 100 caracteres.')

// Better Auth stores usernames in lowercase, so the form checks the value it will store
const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe um nome de usuário.')
  .min(
    USERNAME_MIN_LENGTH,
    `O nome de usuário precisa ter pelo menos ${USERNAME_MIN_LENGTH} caracteres.`
  )
  .max(
    USERNAME_MAX_LENGTH,
    `O nome de usuário pode ter no máximo ${USERNAME_MAX_LENGTH} caracteres.`
  )
  .regex(
    USERNAME_PATTERN,
    'Use apenas letras sem acento, números, ponto e sublinhado.'
  )

const newPassword = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`
  )

const passwordConfirmation = z.string().min(1, 'Confirme sua senha.')

const passwordsMatch = z.refine<{
  password: string
  passwordConfirmation: string
}>((data) => data.password === data.passwordConfirmation, {
  message: 'As senhas não coincidem.',
  path: ['passwordConfirmation'],
  // By default an object refinement waits for every field to be valid; this one only needs the
  // confirmation filled, so a mismatch shows even while the password is still too short
  when: ({ issues }) =>
    issues.every((issue) => issue.path?.[0] !== 'passwordConfirmation')
})

export const signUpSchema = z
  .object({ name, email, password: newPassword, passwordConfirmation })
  .check(passwordsMatch)
export type SignUpInput = z.input<typeof signUpSchema>

export const studentSignUpSchema = z
  .object({
    name,
    username,
    email,
    password: newPassword,
    passwordConfirmation
  })
  .check(passwordsMatch)
export type StudentSignUpInput = z.input<typeof studentSignUpSchema>

export const signInSchema = z.object({
  identifier: z.string().trim().min(1, 'Informe seu e-mail ou usuário.'),
  password: z.string().min(1, 'Informe sua senha.')
})
export type SignInInput = z.input<typeof signInSchema>

export const forgotPasswordSchema = z.object({ email })
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({ password: newPassword, passwordConfirmation })
  .check(passwordsMatch)
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>

export const changePasswordSchema = resetPasswordSchema
export type ChangePasswordInput = z.input<typeof changePasswordSchema>
