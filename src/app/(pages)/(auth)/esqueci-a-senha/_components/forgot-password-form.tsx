'use client'

import { requestPasswordReset } from '@/app/(pages)/(auth)/esqueci-a-senha/_components/action'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { forgotPasswordSchema } from '@/models/authentication-model/schema'

export const ForgotPasswordForm = () => {
  const { Form, Field, state, pending, announcement, formProps } =
    useFormAction({
      schema: forgotPasswordSchema,
      defaultValues: { email: '' },
      action: requestPasswordReset
    })

  if (state.status === 'success') return <FormMessage state={state} />

  return (
    <Form {...formProps} className="flex flex-col gap-6">
      <Field name="email" label="E-mail" type="email" autoComplete="username" />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>Enviar link</SubmitButton>
    </Form>
  )
}
