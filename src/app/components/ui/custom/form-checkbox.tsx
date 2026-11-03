'use client'

import type { ReactNode } from 'react'
import {
  type Control,
  type FieldValues,
  type Path,
  useController
} from 'react-hook-form'

import { Checkbox } from '@/app/components/ui/8bit/checkbox'
import { Label } from '@/app/components/ui/8bit/label'

import { FieldFrame } from './form-field'

type FormCheckboxProps<TValues extends FieldValues> = {
  control: Control<TValues>
  name: Path<TValues>
  label: ReactNode
}

export const FormCheckbox = <TValues extends FieldValues>({
  control,
  name,
  label
}: FormCheckboxProps<TValues>) => {
  const { field, fieldState } = useController({ control, name })

  return (
    <FieldFrame error={fieldState.error?.message}>
      {(controlProps) => (
        <Label
          className="items-start gap-4 text-xs leading-relaxed font-normal"
          // Keeps the focus on the field: the blur would reveal its error and move the checkbox under
          // the pointer between mousedown and mouseup, losing the click (#53)
          onMouseDown={(event) => event.preventDefault()}
        >
          <Checkbox
            // The margin makes room for the pixel frame, drawn 1.5 spacing units outside the checkbox
            className="m-1.5"
            name={field.name}
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => field.onChange(checked)}
            onBlur={field.onBlur}
            ref={field.ref}
            {...controlProps}
          />
          <span>{label}</span>
        </Label>
      )}
    </FieldFrame>
  )
}
