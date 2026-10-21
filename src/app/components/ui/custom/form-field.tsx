import { type ComponentProps, type ReactNode, useId } from 'react'

import { Input } from '@/app/components/ui/8bit/input'
import { Label } from '@/app/components/ui/8bit/label'

type FormFieldProps = Omit<ComponentProps<typeof Input>, 'id'> & {
  label: string
  labelAction?: ReactNode
  hint?: string
  error?: string
}

export const FormField = ({
  label,
  labelAction,
  hint,
  error,
  ...props
}: FormFieldProps) => {
  // useId rather than the field name, so two forms on a page never share an id
  const id = useId()
  const inputId = `${id}-input`
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <Label htmlFor={inputId} className="text-xs">
          {label}
        </Label>
        {labelAction}
      </div>
      <Input
        id={inputId}
        // The pixel frame is drawn 1.5 spacing units outside the input; the margin makes room for it,
        // so the gap after a field is the same whether it ends in the frame or in a hint/error
        className="my-1.5"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs leading-relaxed text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
