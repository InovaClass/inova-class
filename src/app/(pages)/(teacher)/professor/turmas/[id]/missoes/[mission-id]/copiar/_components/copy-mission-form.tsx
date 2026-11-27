'use client'

import { FormMessage } from '@/app/components/ui/custom/form-message'
import { FormRadioGroup } from '@/app/components/ui/custom/form-radio-group'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import {
  type CopyMissionInput,
  copyMissionSchema
} from '@/models/mission/schema'

type CopyMissionFormProps = {
  classes: { id: string; name: string }[]
  action: (input: CopyMissionInput) => Promise<FormState<CopyMissionInput>>
}

export const CopyMissionForm = ({ classes, action }: CopyMissionFormProps) => {
  const { control, state, pending, announcement, formProps } = useFormAction({
    schema: copyMissionSchema,
    defaultValues: { targetClassId: '' },
    action
  })

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FormRadioGroup
        control={control}
        name="targetClassId"
        label="Turma"
        options={classes.map(({ id, name }) => ({ value: id, label: name }))}
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pendingLabel="Copiando" pending={pending}>
        Copiar
      </SubmitButton>
    </form>
  )
}
