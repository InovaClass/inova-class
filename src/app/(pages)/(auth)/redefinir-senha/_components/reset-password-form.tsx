'use client'

import { resetPassword } from '@/app/(pages)/(auth)/redefinir-senha/_components/action'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { PASSWORD_MIN_LENGTH } from '@/constants/user'
import { resetPasswordSchema } from '@/models/authentication-model/schema'

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const { Form, Field, state, pending, announcement, formProps } =
    useFormAction({
      schema: resetPasswordSchema,
      defaultValues: { password: '', passwordConfirmation: '' },
      action: resetPassword.bind(null, token)
    })

  return (
    <Form {...formProps} className="flex flex-col gap-6">
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
