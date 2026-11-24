'use client'

import { Textarea } from '@/app/components/ui/8bit/textarea'
import { FieldFrame, FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import {
  type SubmissionInput,
  submissionSchema
} from '@/models/objective-submission/schema'

type SubmissionFormProps = {
  objectiveName: string
  // The objective's heading names the form, since every objective's form has the same fields
  titleId: string
  defaultValues: SubmissionInput
  action: (input: SubmissionInput) => Promise<FormState<SubmissionInput>>
  onResult: (result: FormState) => void
}

export const SubmissionForm = ({
  objectiveName,
  titleId,
  defaultValues,
  action,
  onResult
}: SubmissionFormProps) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: submissionSchema,
    defaultValues,
    action: async (input) => {
      const result = await action(input)
      onResult(result)
      if (result.status !== 'success') return result
      // The form leaves with the objective's new state, so the list shows the message instead
      return { status: 'idle' }
    }
  })
  const { error: textError, ...text } = field('text')

  return (
    <form
      {...formProps}
      aria-labelledby={titleId}
      className="flex flex-col gap-6"
    >
      <FieldFrame
        label="O que você fez"
        hint="O professor lê o seu texto antes de aprovar."
        error={textError}
      >
        {(frameControl) => (
          // The pixel frame is drawn 1.5 spacing units outside the textarea; the margin makes room for it
          <Textarea className="my-1.5 min-h-24" {...text} {...frameControl} />
        )}
      </FieldFrame>
      <FormField
        label="Link (opcional)"
        type="url"
        inputMode="url"
        {...field('link')}
      />
      <FormMessage state={state} announcement={announcement} />
      {/* The frame is drawn outside the button, so it needs room for it */}
      <div className="p-1.5">
        <SubmitButton pending={pending}>
          Enviar
          <span className="sr-only"> {objectiveName}</span>
        </SubmitButton>
      </div>
    </form>
  )
}
