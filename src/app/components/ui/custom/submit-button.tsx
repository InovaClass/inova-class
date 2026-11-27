'use client'

import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { Button } from '@/app/components/ui/8bit/button'
import { Spinner } from '@/app/components/ui/8bit/spinner'

// Three periods, not `…` (U+2026): Press Start 2P only covers Latin-1, so the ellipsis would fall back
// to Arial
const pendingText = (pendingLabel: string) => `${pendingLabel}...`

export const SubmitButton = ({
  pending,
  pendingLabel,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, 'type' | 'disabled'> & {
  pending: boolean
  // In the gerund (e.g. "Salvando"), so the button says what is happening while the action runs
  pendingLabel: string
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
      {pending ? (
        <>
          <Spinner aria-hidden className="size-4" />
          {pendingText(pendingLabel)}
        </>
      ) : (
        children
      )}
    </Button>
    {/* Not every screen reader voices aria-disabled on the focused button, so the pending state is
    announced by a live region that stays mounted */}
    <span role="status" className="sr-only">
      {pending ? pendingText(pendingLabel) : ''}
    </span>
  </>
)
