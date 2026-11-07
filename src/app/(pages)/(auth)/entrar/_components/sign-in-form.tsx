'use client'

import Link from 'next/link'
import { useWatch } from 'react-hook-form'

import { ResendVerificationButton } from '@/app/(pages)/(auth)/_components/resend-verification-button'
import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { signInSchema } from '@/models/authentication/schema'

import { signIn, type SignInState } from './action'

export const SignInForm = ({ notice }: { notice?: SignInState }) => {
  const { field, control, state, pending, announcement, formProps } =
    useFormAction({
      schema: signInSchema,
      defaultValues: { identifier: '', password: '' },
      action: signIn,
      initialState: notice
    })

  const identifier = useWatch({ control, name: 'identifier' })
  const unverified =
    state.status === 'error' && 'resendTo' in state ? state.resendTo : undefined
  // Once the field names another account, the button would resend to one no longer on screen
  const resendTo =
    unverified === identifier.trim().toLowerCase() ? unverified : undefined

  return (
    <div className="flex flex-col gap-6">
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
      {/* Keyed by the result, so each new link restarts the cooldown */}
      {resendTo && (
        <ResendVerificationButton
          key={state.status === 'error' ? state.id : undefined}
          identifier={resendTo}
        />
      )}
    </div>
  )
}
