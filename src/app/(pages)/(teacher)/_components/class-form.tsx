'use client'

import { Textarea } from '@/app/components/ui/8bit/textarea'
import { FieldFrame, FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import { type ClassInput, classSchema } from '@/models/class/schema'

type ClassFormProps = {
  defaultValues?: ClassInput
  action: (input: ClassInput) => Promise<FormState<ClassInput>>
  submitLabel: string
}

export const ClassForm = ({
  defaultValues = { name: '', description: '' },
  action,
  submitLabel
}: ClassFormProps) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: classSchema,
    defaultValues,
    action
  })
  const { error: descriptionError, ...description } = field('description')

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormField label="Nome" autoComplete="off" {...field('name')} />
      <FieldFrame label="Descrição (opcional)" error={descriptionError}>
        {(control) => (
          // The pixel frame is drawn 1.5 spacing units outside the textarea; the margin makes room for it
          <Textarea className="my-1.5" {...description} {...control} />
        )}
      </FieldFrame>
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  )
}
