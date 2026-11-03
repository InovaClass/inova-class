'use client'

import type { ReactNode } from 'react'

import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { PASSWORD_MIN_LENGTH } from '@/constants/user'
import { signUpSchema } from '@/models/authentication/schema'

import { signUp } from './action'

// Other ways to sign up (Google) go away with the form: after sign-up the email still needs
// confirming, and Google can't link to an unverified account
export const SignUpForm = ({ children }: { children?: ReactNode }) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: signUpSchema,
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: ''
    },
    action: signUp
  })

  if (state.status === 'success') return <FormMessage state={state} />

  return (
    <div className="flex flex-col gap-6">
      <form {...formProps} className="flex flex-col gap-6">
        <FormField label="Nome" autoComplete="name" {...field('name')} />
        <FormField
          label="E-mail"
          type="email"
          autoComplete="username"
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
