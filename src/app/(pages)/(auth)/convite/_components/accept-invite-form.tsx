'use client'

import type { ReactNode } from 'react'

import { FormCheckbox } from '@/app/components/ui/custom/form-checkbox'
import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { PASSWORD_MIN_LENGTH } from '@/constants/user'
import { acceptInviteSchema } from '@/models/authentication/schema'

import { acceptInvite } from './action'

export const AcceptInviteForm = ({
  token,
  username,
  termsLabel
}: {
  token: string
  username: string
  termsLabel: ReactNode
}) => {
  const { field, control, state, pending, announcement, formProps } =
    useFormAction({
      schema: acceptInviteSchema,
      defaultValues: {
        password: '',
        passwordConfirmation: '',
        acceptedTerms: false
      },
      action: acceptInvite.bind(null, token)
    })

  return (
    <form {...formProps} className="flex flex-col gap-6">
      {/* Tells password managers which login the new password belongs to */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={username}
        readOnly
        hidden
      />
      <p className="text-xs leading-relaxed wrap-anywhere">
        Seu nome de usuário é {username}.
      </p>
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
      <FormCheckbox control={control} name="acceptedTerms" label={termsLabel} />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>Criar senha</SubmitButton>
    </form>
  )
}
