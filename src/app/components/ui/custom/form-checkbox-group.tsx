'use client'

import { CheckboxGroup } from '@base-ui/react/checkbox-group'
import { useId } from 'react'
import {
  type Control,
  type FieldValues,
  type Path,
  useController
} from 'react-hook-form'

import { Checkbox } from '@/app/components/ui/8bit/checkbox'

type CheckboxOption = { value: string; label: string }

type FormCheckboxGroupProps<TValues extends FieldValues> = {
  control: Control<TValues>
  name: Path<TValues>
  label: string
  options: readonly CheckboxOption[]
}

// Not on FieldFrame: its `<label htmlFor>` can't name a group, which takes `aria-labelledby`
export const FormCheckboxGroup = <TValues extends FieldValues>({
  control,
  name,
  label,
  options
}: FormCheckboxGroupProps<TValues>) => {
  const { field, fieldState } = useController({ control, name })
  const id = useId()
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const error = fieldState.error?.message

  return (
    <div className="grid gap-3">
      <p id={labelId} className="text-xs font-medium">
        {label}
      </p>
      <CheckboxGroup
        // RHF focuses the first invalid field through its ref, and the group itself takes no focus
        ref={(group) =>
          field.ref({
            focus: () =>
              group?.querySelector<HTMLElement>('[role="checkbox"]')?.focus()
          })
        }
        value={field.value}
        onValueChange={(value) => field.onChange(value)}
        // Each checkbox is its own tab stop, so the field is only left once the focus leaves the group
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            field.onBlur()
          }
        }}
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        className="flex flex-col gap-4"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-w-0 cursor-pointer items-start gap-4 text-xs leading-relaxed"
            // Keeps the focus on the group: the blur would reveal its error and move the checkbox
            // under the pointer between mousedown and mouseup, losing the click (#53)
            onMouseDown={(event) => event.preventDefault()}
          >
            <Checkbox
              // The margin makes room for the pixel frame, drawn 1.5 spacing units outside the checkbox
              className="m-1.5"
              name={field.name}
              value={option.value}
              // On each checkbox, where the focus lands and the frame turns red
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
            <span className="min-w-0 wrap-anywhere">{option.label}</span>
          </label>
        ))}
      </CheckboxGroup>
      {error && (
        <p id={errorId} className="text-xs leading-relaxed text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
