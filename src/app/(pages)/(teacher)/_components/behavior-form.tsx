'use client'

import { FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import { HP_MAX } from '@/constants/game'
import type { FormState } from '@/entry/form-action'
import {
  BEHAVIOR_COINS_MAX,
  BEHAVIOR_XP_MAX
} from '@/models/behavior/constants'
import { type BehaviorInput, behaviorSchema } from '@/models/behavior/schema'

type BehaviorFormProps = {
  defaultValues?: BehaviorInput
  action: (input: BehaviorInput) => Promise<FormState<BehaviorInput>>
  submitLabel: string
}

// Text rather than a number input, which reports a value it can't parse (e.g. `5-`) as blank, and
// blank counts as zero. Only XP gets the numeric keyboard: the one on iOS has no minus key
const POINTS_INPUT = { placeholder: '0', autoComplete: 'off' }

export const BehaviorForm = ({
  defaultValues = { name: '', xp: '', hp: '', coins: '' },
  action,
  submitLabel
}: BehaviorFormProps) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: behaviorSchema,
    defaultValues,
    action
  })

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormField label="Nome" autoComplete="off" {...field('name')} />
      <FormField
        label="XP"
        hint={`De 0 a ${BEHAVIOR_XP_MAX}.`}
        {...POINTS_INPUT}
        inputMode="numeric"
        {...field('xp', { revalidates: ['hp', 'coins'] })}
      />
      <FormField
        label="HP"
        hint={`De -${HP_MAX} a ${HP_MAX}. Um valor negativo tira HP.`}
        {...POINTS_INPUT}
        {...field('hp', { revalidates: ['xp', 'coins'] })}
      />
      <FormField
        label="Moedas"
        hint={`De -${BEHAVIOR_COINS_MAX} a ${BEHAVIOR_COINS_MAX}. Um valor negativo tira moedas.`}
        {...POINTS_INPUT}
        {...field('coins', { revalidates: ['xp', 'hp'] })}
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  )
}
