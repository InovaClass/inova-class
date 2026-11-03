'use client'

import Link from 'next/link'

import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { signInSchema } from '@/models/authentication/schema'

import { signIn, type SignInState } from './action'

export const SignInForm = ({ notice }: { notice?: SignInState }) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: signInSchema,
    defaultValues: { identifier: '', password: '' },
    action: signIn,
    initialState: notice
  })

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormField
        label="E-mail ou usuário"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        {...field('identifier')}
      />
      <FormField
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
        {...field('password')}
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>Entrar</SubmitButton>
    </form>
  )
}
