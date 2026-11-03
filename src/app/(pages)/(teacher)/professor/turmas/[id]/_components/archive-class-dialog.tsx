'use client'

import { useActionState, useState } from 'react'

import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter
} from '@/app/components/ui/8bit/alert-dialog'
import { Button } from '@/app/components/ui/8bit/button'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/app/components/ui/shadcn/alert-dialog'
import type { FormState } from '@/entry/form-action'

type ArchiveClassDialogProps = {
  schoolClassName: string
  action: (state: FormState, formData: FormData) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const ArchiveClassDialog = ({
  schoolClassName,
  action
}: ArchiveClassDialogProps) => {
  const [state, dispatch, pending] = useActionState(action, IDLE_STATE)
  const [open, setOpen] = useState(false)
  const [dismissedStateId, setDismissedStateId] = useState<string>()

  const handleOpenChange = (nextOpen: boolean) => {
    // The action can't be cancelled, so closing now would look like a cancel while the class still
    // gets archived, and an error would have nowhere to show
    if (pending) return
    setOpen(nextOpen)
    if (!nextOpen && state.status !== 'idle') setDismissedStateId(state.id)
  }

  // The popup unmounts on close but this state doesn't, and FormMessage takes the focus when it
  // mounts with a message, so reopening would bring back the old error
  const visibleState =
    state.status !== 'idle' && state.id === dismissedStateId
      ? IDLE_STATE
      : state

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        Arquivar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm leading-relaxed">
            Arquivar turma?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed wrap-anywhere">
            {schoolClassName} sairá do seu painel. Os dados da turma serão
            mantidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={dispatch} className="flex flex-col gap-6">
          <FormMessage state={visibleState} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <SubmitButton
              pending={pending}
              variant="destructive"
              // `text-destructive` on the variant's tinted background stays under the 4.5:1 of WCAG
              // 1.4.3, so the frame carries the warning
              className="text-foreground [--pixel-border:var(--destructive)] hover:text-foreground"
            >
              Arquivar
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
