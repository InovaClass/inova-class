'use client'

import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import {
  type ConsequenceInput,
  consequenceSchema
} from '@/models/consequence/schema'

type ConsequenceFormProps = {
  defaultValues?: ConsequenceInput
  action: (input: ConsequenceInput) => Promise<FormState<ConsequenceInput>>
  submitLabel: string
}

export const ConsequenceForm = ({
  defaultValues = { name: '' },
  action,
  submitLabel
}: ConsequenceFormProps) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: consequenceSchema,
    defaultValues,
    action
  })

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormField label="Consequência" autoComplete="off" {...field('name')} />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  )
}
