'use client'

import type { ReactNode } from 'react'

import { signUpStudent } from '@/app/(pages)/(auth)/cadastro/aluno/_components/action'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH
} from '@/constants/user'
import { studentSignUpSchema } from '@/models/authentication-model/schema'

// Like the teacher's form, it hides Google after sign-up: Google can't link to an unverified account
export const StudentSignUpForm = ({ children }: { children?: ReactNode }) => {
  const { Form, Field, state, pending, announcement, formProps } =
    useFormAction({
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
      <Form {...formProps} className="flex flex-col gap-6">
        <Field name="name" label="Nome" autoComplete="name" />
        <Field
          name="username"
          label="Nome de usuário"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          hint={`De ${USERNAME_MIN_LENGTH} a ${USERNAME_MAX_LENGTH} caracteres: letras sem acento, números, ponto e sublinhado.`}
        />
        <Field name="email" label="E-mail" type="email" autoComplete="email" />
        <Field
          name="password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`}
        />
        <Field
          name="passwordConfirmation"
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
        />
        <FormMessage state={state} announcement={announcement} />
        <SubmitButton pending={pending}>Criar conta</SubmitButton>
      </Form>
      {children}
    </div>
  )
}
