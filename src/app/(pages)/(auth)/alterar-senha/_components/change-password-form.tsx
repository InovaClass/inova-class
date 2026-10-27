'use client'

import { changePassword } from '@/app/(pages)/(auth)/alterar-senha/_components/action'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { PASSWORD_MIN_LENGTH } from '@/constants/user'
import { changePasswordSchema } from '@/models/authentication-model/schema'

export const ChangePasswordForm = ({ username }: { username: string }) => {
  const { Form, Field, state, pending, announcement, formProps } =
    useFormAction({
      schema: changePasswordSchema,
      defaultValues: { password: '', passwordConfirmation: '' },
      action: changePassword
    })

  return (
    <Form {...formProps} className="flex flex-col gap-6">
      {/* Tells password managers which saved login the new password replaces */}
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={username}
        readOnly
        hidden
      />
      <Field
        name="password"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        hint={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`}
      />
      <Field
        name="passwordConfirmation"
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>Salvar senha</SubmitButton>
    </Form>
  )
}
