'use client'

import { Textarea } from '@/app/components/ui/8bit/textarea'
import { FieldFrame, FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import { REWARD_PRICE_MAX, REWARD_STOCK_MAX } from '@/models/reward/constants'
import { type RewardInput, rewardSchema } from '@/models/reward/schema'

type RewardFormProps = {
  defaultValues?: RewardInput
  action: (input: RewardInput) => Promise<FormState<RewardInput>>
  submitLabel: string
  submitPendingLabel: string
}

// Text rather than a number input, which reports a value it can't parse as blank
const NUMBER_INPUT = { autoComplete: 'off', inputMode: 'numeric' } as const

export const RewardForm = ({
  defaultValues = { name: '', description: '', price: '', stock: '' },
  action,
  submitLabel,
  submitPendingLabel
}: RewardFormProps) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: rewardSchema,
    defaultValues,
    action
  })
  const { error: descriptionError, ...description } = field('description')

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormField label="Nome" autoComplete="off" {...field('name')} />
      <FieldFrame label="Descrição (opcional)" error={descriptionError}>
        {(frameControl) => (
          // The pixel frame is drawn 1.5 spacing units outside the textarea; the margin makes room for it
          <Textarea className="my-1.5" {...description} {...frameControl} />
        )}
      </FieldFrame>
      <FormField
        label="Preço em moedas"
        hint={`De 1 a ${REWARD_PRICE_MAX}.`}
        {...NUMBER_INPUT}
        {...field('price')}
      />
      <FormField
        label="Estoque (opcional)"
        hint={`De 0 a ${REWARD_STOCK_MAX}. Em branco, não tem limite.`}
        {...NUMBER_INPUT}
        {...field('stock')}
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending} pendingLabel={submitPendingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  )
}
