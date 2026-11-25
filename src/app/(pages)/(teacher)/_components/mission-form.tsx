'use client'

import { Textarea } from '@/app/components/ui/8bit/textarea'
import { FieldFrame, FormField } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { FormRadioGroup } from '@/app/components/ui/custom/form-radio-group'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import { MAP_MANIFEST } from '@/models/mission/map-manifest'
import {
  DEFAULT_MAP,
  MISSION_MAP_IDS,
  MISSION_MAP_NAMES
} from '@/models/mission/maps'
import { type MissionInput, missionSchema } from '@/models/mission/schema'

const MAP_OPTIONS = MISSION_MAP_IDS.map((id) => ({
  value: id,
  label: MISSION_MAP_NAMES[id],
  preview: (
    // A fraction of its size, so smoothed instead of pixelated
    <span
      className="aspect-5/3 w-40 max-w-full bg-cover"
      style={{ backgroundImage: `url(${MAP_MANIFEST.maps[id].src})` }}
    />
  )
}))

type MissionFormProps = {
  defaultValues?: MissionInput
  action: (input: MissionInput) => Promise<FormState<MissionInput>>
  submitLabel: string
}

export const MissionForm = ({
  defaultValues = { name: '', description: '', map: DEFAULT_MAP },
  action,
  submitLabel
}: MissionFormProps) => {
  const { field, control, state, pending, announcement, formProps } =
    useFormAction({ schema: missionSchema, defaultValues, action })
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
      <FormRadioGroup
        control={control}
        name="map"
        label="Mapa"
        options={MAP_OPTIONS}
      />
      <FormMessage state={state} announcement={announcement} />
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  )
}
