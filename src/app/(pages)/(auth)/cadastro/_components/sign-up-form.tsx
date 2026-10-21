'use client'

import { signUp } from '@/app/(pages)/(auth)/cadastro/_components/action'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { PASSWORD_MIN_LENGTH } from '@/constants/user'
import { signUpSchema } from '@/models/authentication-model/schema'

export const SignUpForm = () => {
  const { Form, Field, state, pending, announcement, formProps } =
    useFormAction({
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
    <Form {...formProps} className="flex flex-col gap-6">
      <Field name="name" label="Nome" autoComplete="name" />
      <Field name="email" label="E-mail" type="email" autoComplete="username" />
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
  )
}
