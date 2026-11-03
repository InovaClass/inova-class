'use client'

import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { PASSWORD_MIN_LENGTH } from '@/constants/user'
import { changePasswordSchema } from '@/models/authentication/schema'

import { changePassword } from './action'

export const ChangePasswordForm = ({ username }: { username: string }) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: changePasswordSchema,
    defaultValues: { password: '', passwordConfirmation: '' },
    action: changePassword
  })

  return (
    <form {...formProps} className="flex flex-col gap-6">
      {/* Tells password managers which saved login the new password replaces */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={username}
        readOnly
        hidden
      />
      <FormField
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        hint={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`}
        {...field('password', { revalidates: 'passwordConfirmation' })}
      />
      <FormField
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        {...field('passwordConfirmation')}
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>Salvar senha</SubmitButton>
    </form>
  )
}
