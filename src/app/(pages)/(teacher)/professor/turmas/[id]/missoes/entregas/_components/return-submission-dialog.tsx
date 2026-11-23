'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/app/components/ui/8bit/button'
import { DialogContent } from '@/app/components/ui/8bit/dialog'
import { Textarea } from '@/app/components/ui/8bit/textarea'
import { FieldFrame } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/app/components/ui/shadcn/dialog'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import {
  type ReturnSubmissionInput,
  returnSubmissionSchema
} from '@/models/objective-submission/schema'

type ReturnSubmissionFormProps = {
  action: (
    input: ReturnSubmissionInput
  ) => Promise<FormState<ReturnSubmissionInput>>
  onSuccess: (result: FormState) => void
  onPendingChange: (pending: boolean) => void
}

// Its own component, so the form starts empty each time the dialog opens
const ReturnSubmissionForm = ({
  action,
  onSuccess,
  onPendingChange
}: ReturnSubmissionFormProps) => {
  const { field, state, pending, announcement, formProps } = useFormAction({
    schema: returnSubmissionSchema,
    defaultValues: { comment: '' },
    action: async (input) => {
      const result = await action(input)
      if (result.status === 'success') onSuccess(result)
      return result
    }
  })
  // A state set inside the transition would only commit when it ends, too late to keep the dialog open
  useEffect(() => onPendingChange(pending), [pending, onPendingChange])
  const { error: commentError, ...comment } = field('comment')

  return (
    <form {...formProps} className="flex flex-col gap-6">
      <FieldFrame
        label="Comentário"
        hint="O aluno lê este comentário e pode enviar o objetivo de novo."
        error={commentError}
      >
        {(frameControl) => (
          // The pixel frame is drawn 1.5 spacing units outside the textarea; the margin makes room for it
          <Textarea
            className="my-1.5 min-h-24"
            {...comment}
            {...frameControl}
          />
        )}
      </FieldFrame>
      <FormMessage state={state} announcement={announcement} />
      <DialogFooter className="gap-6 p-1.5">
        <DialogClose
          render={<Button variant="ghost" />}
          aria-disabled={pending}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Cancelar
        </DialogClose>
        <SubmitButton pending={pending}>Devolver</SubmitButton>
      </DialogFooter>
    </form>
  )
}

type ReturnSubmissionDialogProps = {
  objectiveName: string
  studentLabel: string
  action: ReturnSubmissionFormProps['action']
  onSuccess: (result: FormState) => void
}

export const ReturnSubmissionDialog = ({
  objectiveName,
  studentLabel,
  action,
  onSuccess
}: ReturnSubmissionDialogProps) => {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    // The return can't be cancelled, so closing now would look like a cancel while it still goes through
    if (pending) return
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        Devolver
        <span className="sr-only">
          {' '}
          {objectiveName} de {studentLabel}
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm leading-relaxed">
            Devolver entrega
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed wrap-anywhere">
            {`Diga a ${studentLabel} o que falta em ${objectiveName}. A entrega volta sem recompensa e o aluno pode enviar de novo.`}
          </DialogDescription>
        </DialogHeader>
        <ReturnSubmissionForm
          action={action}
          onPendingChange={setPending}
          onSuccess={(result) => {
            setOpen(false)
            onSuccess(result)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
