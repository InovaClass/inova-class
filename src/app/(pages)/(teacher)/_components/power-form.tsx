'use client'

import { Textarea } from '@/app/components/ui/8bit/textarea'
import { FieldFrame, FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { FormRadioGroup } from '@/app/components/ui/custom/form-radio-group'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import { CHARACTER_CLASS_NAMES } from '@/models/character/constants'
import { CHARACTER_CLASSES } from '@/models/character/look'
import { POWER_COST_MAX, POWER_MIN_LEVEL_MAX } from '@/models/power/constants'
import { type PowerInput, powerSchema } from '@/models/power/schema'

type PowerFormProps = {
  defaultValues?: PowerInput
  action: (input: PowerInput) => Promise<FormState<PowerInput>>
  submitLabel: string
}

const CHARACTER_CLASS_OPTIONS = CHARACTER_CLASSES.map((characterClass) => ({
  value: characterClass,
  label: CHARACTER_CLASS_NAMES[characterClass]
}))

// Text rather than a number input, which reports a value it can't parse as blank
const NUMBER_INPUT = { autoComplete: 'off', inputMode: 'numeric' } as const

export const PowerForm = ({
  defaultValues = {
    characterClass: 'warrior',
    name: '',
    description: '',
    cost: '',
    minLevel: '1'
  },
  action,
  submitLabel
}: PowerFormProps) => {
  const { field, control, state, pending, announcement, formProps } =
    useFormAction({ schema: powerSchema, defaultValues, action })
  const { error: descriptionError, ...description } = field('description')

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormRadioGroup
        control={control}
        name="characterClass"
        label="Classe"
        options={CHARACTER_CLASS_OPTIONS}
      />
      <FormField label="Nome" autoComplete="off" {...field('name')} />
      <FieldFrame label="Descrição (opcional)" error={descriptionError}>
        {(frameControl) => (
          // The pixel frame is drawn 1.5 spacing units outside the textarea; the margin makes room for it
          <Textarea className="my-1.5" {...description} {...frameControl} />
        )}
      </FieldFrame>
      <FormField
        label="Custo em moedas"
        hint={`De 1 a ${POWER_COST_MAX}.`}
        {...NUMBER_INPUT}
        {...field('cost')}
      />
      <FormField
        label="Nível mínimo"
        hint={`De 1 a ${POWER_MIN_LEVEL_MAX}.`}
        {...NUMBER_INPUT}
        {...field('minLevel')}
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  )
}
