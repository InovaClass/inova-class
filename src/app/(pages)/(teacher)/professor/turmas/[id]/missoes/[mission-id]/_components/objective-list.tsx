'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { ActionButton } from '@/app/components/ui/custom/action-button'
import { ConfirmActionDialog } from '@/app/components/ui/custom/confirm-action-dialog'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import {
  describeLatePenalty,
  describeObjectiveReward,
  formatDueOn
} from '@/app/helpers/objective-values'
import type { FormState } from '@/entry/form-action'
import type { MoveDirection } from '@/models/mission/order'

type Objective = {
  id: string
  name: string
  story: string
  dueOn: string | null
  xpReward: number
  coinReward: number
  latePenaltyCoins: number
  latePenaltyHp: number
}

type ObjectiveListProps = {
  objectivesPath: string
  // Only a published mission's objectives can be completed, since a draft is hidden from the students
  published: boolean
  objectives: Objective[]
  moveAction: (
    objectiveId: string,
    direction: MoveDirection
  ) => Promise<FormState>
  removeAction: (objectiveId: string) => Promise<FormState>
}

type Move = { objectiveId: string; direction: MoveDirection }

const IDLE_STATE: FormState = { status: 'idle' }

const MOVE_LABELS: Record<MoveDirection, string> = {
  up: 'Subir',
  down: 'Descer'
}

export const ObjectiveList = ({
  objectivesPath,
  published,
  objectives,
  moveAction,
  removeAction
}: ObjectiveListProps) => {
  // Out here because the dialog leaves with its row. This message also takes the focus, since the
  // trigger the dialog would return it to is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)
  // A move keeps the focus on the moved row, so its success is only announced
  const [moved, setMoved] = useState<FormState>(IDLE_STATE)
  const pendingFocus = useRef<Move>(undefined)
  const listReference = useRef<HTMLOListElement>(null)

  // Reordering the rows moves the focused button out of the document and back, which drops the
  // focus, and the button itself leaves at either end of the list. Only a focus that dropped to the
  // body is taken back, so a message that took it meanwhile keeps it
  useEffect(() => {
    const move = pendingFocus.current
    pendingFocus.current = undefined
    if (!move) return
    if (document.activeElement && document.activeElement !== document.body) {
      return
    }
    const buttons = [
      ...(listReference.current?.querySelectorAll<HTMLElement>(
        `[data-objective="${CSS.escape(move.objectiveId)}"]`
      ) ?? [])
    ]
    const target =
      buttons.find((button) => button.dataset.direction === move.direction) ??
      buttons[0]
    target?.focus()
  }, [objectives])

  const handleMove = (move: Move) => (result: FormState) => {
    setMoved(result)
    pendingFocus.current = result.status === 'success' ? move : undefined
    if (result.status === 'error') setFeedback(result)
    else if (feedback.status === 'error') setFeedback(IDLE_STATE)
  }

  return (
    <>
      <FormMessage state={feedback} />
      <p aria-live="polite" className="sr-only">
        {moved.status === 'success' && (
          <span key={moved.id}>{moved.message}</span>
        )}
      </p>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-sm leading-relaxed">Objetivos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {objectives.length === 0 ? (
            <Empty className="p-0 md:p-0">
              <EmptyHeader>
                <EmptyTitle className="text-sm leading-relaxed">
                  Nenhum objetivo
                </EmptyTitle>
                <EmptyDescription className="text-xs leading-relaxed">
                  Crie os objetivos na ordem em que os alunos vão cumpri-los.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            // Tailwind's `list-style: none` makes Safari drop the list semantics
            <ol role="list" ref={listReference} className="flex flex-col gap-6">
              {objectives.map((objective, index) => {
                const directions = (['up', 'down'] as const).filter(
                  (direction) =>
                    direction === 'up'
                      ? index > 0
                      : index < objectives.length - 1
                )
                const penalty = describeLatePenalty(objective)
                return (
                  <li
                    key={objective.id}
                    className="flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2">
                      <p className="text-xs leading-relaxed wrap-anywhere">
                        {index + 1}. {objective.name}
                      </p>
                      <p className="line-clamp-3 text-xs leading-relaxed wrap-anywhere whitespace-pre-line text-muted-foreground">
                        {objective.story}
                      </p>
                      <p className="flex flex-wrap gap-x-4 gap-y-2 text-xs leading-relaxed text-muted-foreground">
                        <span>
                          {objective.dueOn
                            ? `Prazo: ${formatDueOn(objective.dueOn)}`
                            : 'Sem prazo'}
                        </span>
                        <span>
                          Recompensa: {describeObjectiveReward(objective)}
                        </span>
                        {penalty && <span>Atraso: {penalty}</span>}
                      </p>
                    </div>
                    {/* The frame is drawn outside the buttons, so the row needs room for it */}
                    <div className="flex flex-wrap gap-6 p-1.5">
                      {directions.map((direction) => (
                        <ActionButton
                          key={direction}
                          variant="outline"
                          data-objective={objective.id}
                          data-direction={direction}
                          action={() => moveAction(objective.id, direction)}
                          onResult={handleMove({
                            objectiveId: objective.id,
                            direction
                          })}
                        >
                          {MOVE_LABELS[direction]}
                          <span className="sr-only"> {objective.name}</span>
                        </ActionButton>
                      ))}
                      {published && (
                        <Link
                          href={`${objectivesPath}/${objective.id}/concluir`}
                          className={linkButtonVariants({ variant: 'outline' })}
                        >
                          Concluir
                          <span className="sr-only"> {objective.name}</span>
                        </Link>
                      )}
                      <Link
                        href={`${objectivesPath}/${objective.id}/editar`}
                        className={linkButtonVariants({ variant: 'outline' })}
                      >
                        Editar
                        <span className="sr-only"> {objective.name}</span>
                      </Link>
                      <ConfirmActionDialog
                        triggerLabel={
                          <>
                            Remover
                            <span className="sr-only"> {objective.name}</span>
                          </>
                        }
                        title="Remover objetivo?"
                        description={`${objective.name} sairá da missão.`}
                        confirmLabel="Remover"
                        action={async () => {
                          const result = await removeAction(objective.id)
                          // The objective stays listed, so the message of an earlier removal would mislead
                          if (result.status === 'error') setFeedback(IDLE_STATE)
                          return result
                        }}
                        onSuccess={setFeedback}
                      />
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </>
  )
}
