'use client'

import Link from 'next/link'

import {
  signIn,
  type SignInState
} from '@/app/(pages)/(auth)/entrar/_components/action'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { signInSchema } from '@/models/authentication-model/schema'

export const SignInForm = ({ notice }: { notice?: SignInState }) => {
  const { Form, Field, state, pending, announcement, formProps } =
    useFormAction({
      schema: signInSchema,
      defaultValues: { email: '', password: '' },
      action: signIn,
      initialState: notice
    })

  return (
    <Form {...formProps} className="flex flex-col gap-6">
      <Field name="email" label="E-mail" type="email" autoComplete="username" />
      <Field
        name="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        labelAction={
          <Link
            href="/esqueci-a-senha"
            className="text-xs underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
        }
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>Entrar</SubmitButton>
    </Form>
  )
}
