'use client'

import { type ReactNode, useId } from 'react'
import {
  type Control,
  type FieldValues,
  type Path,
  useController
} from 'react-hook-form'

import {
  RadioGroup,
  RadioGroupItem
} from '@/app/components/ui/8bit/radio-group'

type RadioOption = { value: string; label: string; preview?: ReactNode }

type FormRadioGroupProps<TValues extends FieldValues> = {
  control: Control<TValues>
  name: Path<TValues>
  label: string
  options: readonly RadioOption[]
  onValueChange?: (value: string) => void
}

// Not on FieldFrame: its `<label htmlFor>` can't name a radiogroup, which takes `aria-labelledby`
export const FormRadioGroup = <TValues extends FieldValues>({
  control,
  name,
  label,
  options,
  onValueChange
}: FormRadioGroupProps<TValues>) => {
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
      <RadioGroup
        // RHF focuses the first invalid field through its ref, and the group itself takes no focus
        ref={(group) =>
          field.ref({
            focus: () =>
              group
                ?.querySelector<HTMLElement>('[role="radio"][data-checked]')
                ?.focus()
          })
        }
        name={field.name}
        value={field.value}
        onValueChange={(value) => {
          field.onChange(value)
          onValueChange?.(value as string)
        }}
        aria-labelledby={labelId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        // Two columns on a phone, so a long list doesn't take a whole screen per option
        className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-w-0 cursor-pointer items-center gap-3 text-xs leading-relaxed"
          >
            <RadioGroupItem
              // The margin makes room for the pixel frame, drawn 1.5 spacing units outside the radio
              className="m-1.5"
              value={option.value}
              onBlur={field.onBlur}
            />
            {option.preview ? (
              <span className="flex min-w-0 flex-col items-center gap-2">
                {option.preview}
                <span>{option.label}</span>
              </span>
            ) : (
              <span className="min-w-0 hyphens-auto">{option.label}</span>
            )}
          </label>
        ))}
      </RadioGroup>
      {error && (
        <p id={errorId} className="text-xs leading-relaxed text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
