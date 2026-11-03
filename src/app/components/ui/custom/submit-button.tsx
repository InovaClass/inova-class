'use client'

import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { Button } from '@/app/components/ui/8bit/button'
import { Spinner } from '@/app/components/ui/8bit/spinner'

export const SubmitButton = ({
  pending,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, 'type' | 'disabled'> & {
  pending: boolean
}) => (
  <>
    <Button
      type="submit"
      disabled={pending}
      focusableWhenDisabled
      // Keeps the focus on the field: the blur would reveal its error and move the button under the
      // pointer between mousedown and mouseup, losing the click. Checking the blur's relatedTarget
      // isn't enough, since Safari doesn't focus a button on click
      onMouseDown={(event) => event.preventDefault()}
      // focusableWhenDisabled sets aria-disabled instead of the native disabled attribute, which is
      // the only state the shadcn button styles
      className={cn(
        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
        className
      )}
      {...props}
    >
      {pending && <Spinner aria-hidden className="size-4" />}
      {children}
    </Button>
    {/* Not every screen reader voices aria-disabled on the focused button, so the pending state is
    announced by a live region that stays mounted */}
    <span role="status" className="sr-only">
      {pending ? 'Enviando…' : ''}
    </span>
  </>
)
