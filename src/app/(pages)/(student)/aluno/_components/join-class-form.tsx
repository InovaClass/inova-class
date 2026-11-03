'use client'

import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { joinClassSchema } from '@/models/enrollment/schema'

import { joinClass } from './action'

export const JoinClassForm = () => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: joinClassSchema,
    defaultValues: { code: '' },
    action: joinClass
  })

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormField
        label="Código da turma"
        hint="Digite o código que você recebeu na sala de aula."
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        {...field('code')}
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>Entrar na turma</SubmitButton>
    </form>
  )
}
