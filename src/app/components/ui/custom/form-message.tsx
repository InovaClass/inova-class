'use client'

import { cn } from 'cn'
import { useEffect, useRef } from 'react'

import type { FormState } from '@/infra/form-action'

type FormMessageProps = {
  state: FormState<never>
  // Field errors are shown next to their fields; this only reads them out, for when the focus
  // can't (it may already be on the invalid field, which doesn't announce it again)
  announcement?: { id: string; text: string }
}

// The live region stays mounted (sr-only, not display:none, without a visible message) so a later
// message is announced; only its child changes. Not `empty:sr-only`: the announcement alone would
// make it non-empty and add a gap to the form's layout
export const FormMessage = ({ state, announcement }: FormMessageProps) => {
  const message = useRef<HTMLParagraphElement>(null)
  const text = state.status === 'idle' ? undefined : state.message
  const action = state.status === 'error' ? state.action : undefined

  useEffect(() => {
    // Also covers a message rendered with the page (e.g. an expired link), which a live region
    // doesn't announce
    if (text) message.current?.focus()
  }, [state, text])

  return (
    <div aria-live="polite" className={cn(!text && 'sr-only')}>
      {state.status !== 'idle' && text && (
        <p
          key={state.id}
          ref={message}
          tabIndex={-1}
          className={cn(
            'flex flex-col gap-2 text-xs leading-relaxed outline-none',
            state.status === 'error'
              ? 'text-destructive'
              : 'text-muted-foreground'
          )}
        >
          <span>{text}</span>
          {action && <span className="text-muted-foreground">{action}</span>}
        </p>
      )}
      {!text && announcement && (
        <p key={announcement.id} className="sr-only">
          {announcement.text}
        </p>
      )}
    </div>
  )
}
