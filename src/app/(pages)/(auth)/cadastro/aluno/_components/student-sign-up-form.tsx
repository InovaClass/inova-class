'use client'

import type { ReactNode } from 'react'

import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH
} from '@/constants/user'
import { studentSignUpSchema } from '@/models/authentication/schema'

import { signUpStudent } from './action'

// Like the teacher's form, it hides Google after sign-up: Google can't link to an unverified account
export const StudentSignUpForm = ({ children }: { children?: ReactNode }) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: studentSignUpSchema,
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      passwordConfirmation: ''
    },
    action: signUpStudent
  })

  if (state.status === 'success') return <FormMessage state={state} />

  return (
    <div className="flex flex-col gap-6">
      <form {...formProps} className="flex flex-col gap-6">
        <FormField label="Nome" autoComplete="name" {...field('name')} />
        <FormField
          label="Nome de usuário"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          hint={`De ${USERNAME_MIN_LENGTH} a ${USERNAME_MAX_LENGTH} caracteres: letras sem acento, números, ponto e sublinhado.`}
          {...field('username')}
        />
        <FormField
          label="E-mail"
          type="email"
          autoComplete="email"
          {...field('email')}
        />
        <FormField
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`}
          {...field('password', { revalidates: 'passwordConfirmation' })}
        />
        <FormField
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          {...field('passwordConfirmation')}
        />
        <FormMessage state={state} announcement={announcement} />
        <SubmitButton pending={pending}>Criar conta</SubmitButton>
      </form>
      {children}
    </div>
  )
}
