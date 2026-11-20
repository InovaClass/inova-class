'use client'

import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { deleteAccountSchema } from '@/models/account/schema'

import { deleteAccount } from './delete-account-action'

export const DeleteAccountForm = () => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: deleteAccountSchema,
    defaultValues: { password: '' },
    action: deleteAccount
  })

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormField
        label="Senha atual"
        type="password"
        autoComplete="current-password"
        hint="Digite sua senha para confirmar a exclusão."
        {...field('password')}
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton
        pending={pending}
        variant="destructive"
        // Same as ConfirmActionDialog: `text-destructive` on the tinted background stays under the
        // 4.5:1 of WCAG 1.4.3, so the frame carries the warning
        className="text-foreground [--pixel-border:var(--destructive)] hover:text-foreground"
      >
        Excluir conta
      </SubmitButton>
    </form>
  )
}
