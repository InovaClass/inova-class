'use client'

import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { PASSWORD_MIN_LENGTH } from '@/constants/user'
import { resetPasswordSchema } from '@/models/authentication/schema'

import { resetPassword } from './action'

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: resetPasswordSchema,
    defaultValues: { password: '', passwordConfirmation: '' },
    action: resetPassword.bind(null, token)
  })

  return (
    <form {...formProps} className="flex flex-col gap-6">
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
