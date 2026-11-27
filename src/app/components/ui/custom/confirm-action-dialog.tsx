'use client'

import { cn } from 'cn'
import { type ReactNode, useActionState, useState } from 'react'

import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter
} from '@/app/components/ui/8bit/alert-dialog'
import { Button } from '@/app/components/ui/8bit/button'
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/app/components/ui/shadcn/alert-dialog'
import type { FormState } from '@/entry/form-action'

import { FormMessage } from './form-message'
import { SubmitButton } from './submit-button'

type ConfirmActionDialogProps = {
  triggerLabel: ReactNode
  title: string
  description: string
  confirmLabel: string
  confirmPendingLabel: string
  // For a confirm that is itself a cancellation, where a second "Cancelar" would be ambiguous
  dismissLabel?: string
  // An action that loses nothing, such as an approval, doesn't need the warning of the default
  confirmVariant?: 'destructive' | 'default'
  action: (state: FormState, formData: FormData) => Promise<FormState>
  onSuccess?: (result: FormState) => void
}

const IDLE_STATE: FormState = { status: 'idle' }

export const ConfirmActionDialog = ({
  triggerLabel,
  title,
  description,
  confirmLabel,
  confirmPendingLabel,
  dismissLabel = 'Cancelar',
  confirmVariant = 'destructive',
  action,
  onSuccess
}: ConfirmActionDialogProps) => {
  const [open, setOpen] = useState(false)
  const [state, dispatch, pending] = useActionState(
    async (previous: FormState, formData: FormData) => {
      const result = await action(previous, formData)
      if (result.status === 'success') {
        setOpen(false)
        onSuccess?.(result)
      }
      return result
    },
    IDLE_STATE
  )
  const [dismissedStateId, setDismissedStateId] = useState<string>()

  const handleOpenChange = (nextOpen: boolean) => {
    // The action can't be cancelled, so closing now would look like a cancel while it still goes
    // through, and an error would have nowhere to show
    if (pending) return
    setOpen(nextOpen)
    if (!nextOpen && state.status !== 'idle') setDismissedStateId(state.id)
  }

  // The popup unmounts on close but this state doesn't, and FormMessage takes the focus when it
  // mounts with a message, so reopening would bring back the old error. A success closes the dialog,
  // so only an error ever shows here
  const visibleState =
    state.status === 'error' && state.id !== dismissedStateId
      ? state
      : IDLE_STATE

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm leading-relaxed">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed wrap-anywhere">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={dispatch} className="flex flex-col gap-6">
          <FormMessage state={visibleState} />
          <AlertDialogFooter>
            {/* Not `disabled`: a mouse confirm leaves the focus here (SubmitButton keeps it from
            moving), and a natively disabled button would drop it to the body. handleOpenChange
            already ignores the click while pending */}
            <AlertDialogCancel
              aria-disabled={pending}
              className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              {dismissLabel}
            </AlertDialogCancel>
            <SubmitButton
              pending={pending}
              pendingLabel={confirmPendingLabel}
              variant={confirmVariant}
              // `text-destructive` on the variant's tinted background stays under the 4.5:1 of WCAG
              // 1.4.3, so the frame carries the warning
              className={cn(
                confirmVariant === 'destructive' &&
                  'text-foreground [--pixel-border:var(--destructive)] hover:text-foreground'
              )}
            >
              {confirmLabel}
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
