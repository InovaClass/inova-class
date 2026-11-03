import { type ComponentProps, type ReactNode, useId } from 'react'

import { Input } from '@/app/components/ui/8bit/input'
import { Label } from '@/app/components/ui/8bit/label'

type ControlProps = {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

type FieldFrameProps = {
  // A control that wraps its own label, such as a checkbox, leaves it out
  label?: string
  labelAction?: ReactNode
  hint?: string
  error?: string
  children: (control: ControlProps) => ReactNode
}

export const FieldFrame = ({
  label,
  labelAction,
  hint,
  error,
  children
}: FieldFrameProps) => {
  // useId rather than the field name, so two forms on a page never share an id
  const id = useId()
  const controlId = `${id}-control`
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="grid gap-1.5">
      {label && (
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <Label htmlFor={controlId} className="text-xs">
            {label}
          </Label>
          {labelAction}
        </div>
      )}
      {children({
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined
      })}
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

type FormFieldProps = Omit<ComponentProps<typeof Input>, 'id'> &
  Omit<FieldFrameProps, 'children' | 'label'> & { label: string }

export const FormField = ({
  label,
  labelAction,
  hint,
  error,
  ...props
}: FormFieldProps) => (
  <FieldFrame label={label} labelAction={labelAction} hint={hint} error={error}>
    {(control) => (
      <Input
        // The pixel frame is drawn 1.5 spacing units outside the input; the margin makes room for it,
        // so the gap after a field is the same whether it ends in the frame or in a hint/error
        className="my-1.5"
        {...props}
        {...control}
      />
    )}
  </FieldFrame>
)
