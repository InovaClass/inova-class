'use client'

import { cn } from 'cn'
import { useActionState, useState } from 'react'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { FormState } from '@/entry/form-action'

import { ConfirmActionDialog } from './confirm-action-dialog'

type JoinCodePanelProps = {
  joinCode: string
  enabled: boolean
  regenerateAction: (state: FormState, formData: FormData) => Promise<FormState>
  toggleAction: (state: FormState, formData: FormData) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const JoinCodePanel = ({
  joinCode,
  enabled,
  regenerateAction,
  toggleAction
}: JoinCodePanelProps) => {
  // One message for both actions, so a success replaces the error of the other one
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)
  const [, dispatch, pending] = useActionState(
    async (previous: FormState, formData: FormData) => {
      const result = await toggleAction(previous, formData)
      setFeedback(result)
      return result
    },
    IDLE_STATE
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm leading-relaxed">Código da turma</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* A success is announced from here rather than through FormMessage, which takes the focus
        and would fight the dialog returning it to its trigger */}
        <div aria-live="polite" className="flex flex-col gap-3">
          <p
            className={cn(
              'text-2xl leading-relaxed tracking-widest',
              !enabled && 'text-muted-foreground'
            )}
          >
            {joinCode}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {enabled
              ? 'Ativo: passe este código para os alunos entrarem na turma.'
              : 'Desativado: ninguém entra na turma com este código.'}
          </p>
          {feedback.status === 'success' && (
            <p className="text-xs leading-relaxed">{feedback.message}</p>
          )}
        </div>
        <FormMessage
          state={feedback.status === 'error' ? feedback : IDLE_STATE}
        />
        {/* The frame is drawn outside the buttons, so the row needs room for it */}
        <div className="flex flex-wrap gap-6 p-1.5">
          <ConfirmActionDialog
            triggerLabel="Gerar novo código"
            title="Gerar novo código?"
            description="O código atual deixará de funcionar. Quem já entrou continua na turma."
            confirmLabel="Gerar código"
            action={regenerateAction}
            onSuccess={setFeedback}
          />
          <form action={dispatch}>
            <SubmitButton pending={pending} variant="outline">
              {enabled ? 'Desativar' : 'Ativar'}
            </SubmitButton>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
