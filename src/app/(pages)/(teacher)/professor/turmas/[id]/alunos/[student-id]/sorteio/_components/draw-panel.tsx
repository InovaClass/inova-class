'use client'

import { cn } from 'cn'
import Link from 'next/link'
import { useActionState, useEffect, useRef } from 'react'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import { HP_MAX } from '@/constants/game'
import type { FormState } from '@/entry/form-action'

type DrawPanelProps = {
  classId: string
  studentLabel: string
  fallen: boolean
  hasConsequences: boolean
  drawAction: () => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

const BODY_TEXT_CLASSES = 'text-xs leading-relaxed wrap-anywhere'

const DrawResult = ({
  consequence,
  studentLabel
}: {
  consequence: string
  studentLabel: string
}) => {
  const result = useRef<HTMLDivElement>(null)

  // The button that was pressed is gone, and the focus would drop to the body
  useEffect(() => {
    result.current?.focus()
  }, [])

  return (
    <div
      ref={result}
      tabIndex={-1}
      className="flex flex-col gap-4 outline-none"
    >
      <p className={`${BODY_TEXT_CLASSES} text-muted-foreground`}>
        Consequência sorteada
      </p>
      <p className="text-sm leading-relaxed wrap-anywhere">{consequence}</p>
      <p className={BODY_TEXT_CLASSES}>
        {studentLabel} está de volta com {HP_MAX} de HP.
      </p>
    </div>
  )
}

export const DrawPanel = ({
  classId,
  studentLabel,
  fallen,
  hasConsequences,
  drawAction
}: DrawPanelProps) => {
  const [state, dispatch, pending] = useActionState(drawAction, IDLE_STATE)

  const renderContent = () => {
    if (!fallen) {
      return (
        <p className={BODY_TEXT_CLASSES}>
          {studentLabel} ainda tem HP. Não há o que sortear.
        </p>
      )
    }
    if (!hasConsequences) {
      return (
        <>
          <p className={BODY_TEXT_CLASSES}>
            {studentLabel} ficou sem HP, mas a turma não tem consequências para
            sortear.
          </p>
          <Link
            href={`/professor/turmas/${classId}/consequencias/novo`}
            className="w-fit text-xs underline underline-offset-4"
          >
            Cadastrar consequência
          </Link>
        </>
      )
    }
    return (
      <form action={dispatch} className="flex flex-col gap-6">
        <p className={BODY_TEXT_CLASSES}>
          {studentLabel} ficou sem HP. O sorteio escolhe uma consequência da
          lista da turma e devolve o HP.
        </p>
        <FormMessage state={state} />
        <div className="p-1.5">
          <SubmitButton pending={pending}>Sortear</SubmitButton>
        </div>
      </form>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm leading-relaxed">Sorteio</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Stays mounted so the result is announced whole, since the focus may only read its first
        line */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className={cn(state.status !== 'success' && 'sr-only')}
        >
          {state.status === 'success' && (
            <DrawResult
              consequence={state.message ?? ''}
              studentLabel={studentLabel}
            />
          )}
        </div>
        {/* Before the HP check: the draw restores the HP, and the page returns with it full */}
        {state.status !== 'success' && renderContent()}
      </CardContent>
    </Card>
  )
}
