'use client'

import { Textarea } from '@/app/components/ui/8bit/textarea'
import { FieldFrame, FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { HP_MAX } from '@/constants/game'
import type { FormState } from '@/entry/form-action'
import {
  OBJECTIVE_COINS_MAX,
  OBJECTIVE_XP_MAX
} from '@/models/mission/constants'
import { type ObjectiveInput, objectiveSchema } from '@/models/mission/schema'

type ObjectiveFormProps = {
  defaultValues?: ObjectiveInput
  action: (input: ObjectiveInput) => Promise<FormState<ObjectiveInput>>
  submitLabel: string
  submitPendingLabel: string
}

// Text rather than a number input, which reports a value it can't parse as blank, and blank counts
// as zero
const POINTS_INPUT = {
  placeholder: '0',
  autoComplete: 'off',
  inputMode: 'numeric'
} as const

export const ObjectiveForm = ({
  defaultValues = {
    name: '',
    story: '',
    dueOn: '',
    xpReward: '',
    coinReward: '',
    latePenaltyCoins: '',
    latePenaltyHp: ''
  },
  action,
  submitLabel,
  submitPendingLabel
}: ObjectiveFormProps) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: objectiveSchema,
    defaultValues,
    action
  })
  const { error: storyError, ...story } = field('story')

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormField label="Nome" autoComplete="off" {...field('name')} />
      <FieldFrame
        label="História"
        hint="O que os alunos leem ao chegar neste objetivo."
        error={storyError}
      >
        {(frameControl) => (
          // The pixel frame is drawn 1.5 spacing units outside the textarea; the margin makes room for it
          <Textarea className="my-1.5 min-h-32" {...story} {...frameControl} />
        )}
      </FieldFrame>
      <FormField
        label="Prazo (opcional)"
        type="date"
        {...field('dueOn', {
          revalidates: ['latePenaltyCoins', 'latePenaltyHp']
        })}
      />
      <FormField
        label="XP da recompensa"
        hint={`De 0 a ${OBJECTIVE_XP_MAX}.`}
        {...POINTS_INPUT}
        {...field('xpReward')}
      />
      <FormField
        label="Moedas da recompensa"
        hint={`De 0 a ${OBJECTIVE_COINS_MAX}.`}
        {...POINTS_INPUT}
        {...field('coinReward', { revalidates: 'xpReward' })}
      />
      <FormField
        label="Moedas tiradas no atraso"
        hint={`De 0 a ${OBJECTIVE_COINS_MAX}. Vale para uma entrega depois do prazo.`}
        {...POINTS_INPUT}
        {...field('latePenaltyCoins')}
      />
      <FormField
        label="HP tirado no atraso"
        hint={`De 0 a ${HP_MAX}. Vale para uma entrega depois do prazo.`}
        {...POINTS_INPUT}
        {...field('latePenaltyHp')}
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending} pendingLabel={submitPendingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  )
}
