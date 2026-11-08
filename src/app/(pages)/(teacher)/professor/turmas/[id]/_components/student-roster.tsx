'use client'

import { cn } from 'cn'
import Link from 'next/link'
import { useState } from 'react'

import { ConfirmActionDialog } from '@/app/(pages)/(teacher)/_components/confirm-action-dialog'
import { identifyStudent } from '@/app/(pages)/(teacher)/professor/turmas/[id]/identify-student'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { Checkbox } from '@/app/components/ui/8bit/checkbox'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { HealthBar } from '@/app/components/ui/8bit/health-bar'
import { useToast } from '@/app/components/ui/8bit/toast'
import { XpBar } from '@/app/components/ui/8bit/xp-bar'
import { CoinCounter } from '@/app/components/ui/custom/coin-counter'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { LevelBadge } from '@/app/components/ui/custom/level-badge'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import { HP_MAX } from '@/constants/game'
import type { FormState } from '@/entry/form-action'

import {
  AwardBehaviorDialog,
  type BehaviorOption
} from './award-behavior-dialog'

type StudentRosterProps = {
  classId: string
  students: {
    id: string
    name: string
    username: string | null
    pending: boolean
    email?: string
    hp: number
    coins: number
    progress: { level: number; current: number; max: number }
  }[]
  behaviors: BehaviorOption[]
  awardAction: (
    behaviorId: string,
    studentIds: string[]
  ) => Promise<{ state: FormState; batchId?: string }>
  undoAction: (batchId: string) => Promise<FormState>
  removeAction: (studentId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

// A long time for a toast, but the teacher is usually looking at the class, not at the screen
const UNDO_TIMEOUT_IN_MS = 15_000

export const StudentRoster = ({
  classId,
  students,
  behaviors,
  awardAction,
  undoAction,
  removeAction
}: StudentRosterProps) => {
  // Out here because the dialog leaves with its row. This message also takes the focus, since the
  // trigger the dialog would return it to is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set())
  const toast = useToast()

  // Derived from the roster, so a student who left the class doesn't stay selected
  const selectedIds = students
    .map(({ id }) => id)
    .filter((id) => checkedIds.has(id))
  const allSelected =
    students.length > 0 && selectedIds.length === students.length

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(checkedIds)
    if (checked) next.add(id)
    else next.delete(id)
    setCheckedIds(next)
  }

  const undo = async (batchId: string) => {
    const result = await undoAction(batchId)
    if (result.status === 'success') {
      toast.add({ title: result.message })
    } else if (result.status === 'error') {
      toast.add({
        title: result.message ?? 'Não foi possível desfazer.',
        description: result.action
      })
    }
  }

  const award = async (behaviorId: string) => {
    const { state, batchId } = await awardAction(behaviorId, selectedIds)
    if (batchId && state.status === 'success') {
      setCheckedIds(new Set())
      const toastId = toast.add({
        title: state.message,
        // The toast sits at the end of the document, and F6 is Base UI's shortcut to it
        description: (
          <span className="max-md:sr-only">F6 leva ao botão Desfazer.</span>
        ),
        timeout: UNDO_TIMEOUT_IN_MS,
        actionProps: {
          children: 'Desfazer',
          onClick: () => {
            toast.close(toastId)
            void undo(batchId)
          }
        }
      })
    }
    return state
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-sm leading-relaxed">Alunos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <FormMessage state={feedback} />
          {students.length === 0 ? (
            <Empty className="p-0 md:p-0">
              <EmptyHeader>
                <EmptyTitle className="text-sm leading-relaxed">
                  Nenhum aluno na turma
                </EmptyTitle>
                <EmptyDescription className="text-xs leading-relaxed">
                  Convide os alunos ou passe o código da turma para eles.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <label className="flex w-fit cursor-pointer items-center gap-4 p-1.5 text-xs leading-relaxed">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    setCheckedIds(
                      new Set(checked ? students.map(({ id }) => id) : [])
                    )
                  }
                />
                Selecionar todos
              </label>
              {/* Tailwind's `list-style: none` makes Safari drop the list semantics */}
              <ul role="list" className="flex flex-col gap-8">
                {students.map(
                  ({
                    id,
                    name,
                    username,
                    pending,
                    email,
                    hp,
                    coins,
                    progress
                  }) => (
                    <li
                      key={id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-4',
                        hp === 0 && 'border-l-4 border-hp pl-2'
                      )}
                    >
                      {/* `after:` stretches the label, so tapping anywhere on the stats selects */}
                      <div className="relative flex min-w-0 flex-1 basis-64 items-start gap-4 p-1.5">
                        <label className="cursor-pointer after:absolute after:inset-0">
                          <Checkbox
                            className="z-10"
                            checked={checkedIds.has(id)}
                            onCheckedChange={(checked) => toggle(id, checked)}
                          />
                          <span className="sr-only">
                            Selecionar{' '}
                            {identifyStudent(name, email ?? username)}
                          </span>
                        </label>
                        <div className="flex min-w-0 flex-1 flex-col gap-3">
                          <p className="text-xs leading-relaxed wrap-anywhere">
                            {name}
                          </p>
                          {hp === 0 && (
                            <p className="text-xs leading-relaxed text-destructive">
                              Sem HP
                            </p>
                          )}
                          {(pending || username) && (
                            <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
                              {pending
                                ? `Convite pendente: ${email}`
                                : username}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-4">
                            <LevelBadge level={progress.level} />
                            <CoinCounter value={coins} />
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div className="flex min-w-0 flex-col gap-2">
                              <p aria-hidden="true" className="text-xs">
                                XP {progress.current}/{progress.max}
                              </p>
                              <div className="p-1.5">
                                <XpBar
                                  value={progress.current}
                                  max={progress.max}
                                />
                              </div>
                            </div>
                            <div className="flex min-w-0 flex-col gap-2">
                              <p aria-hidden="true" className="text-xs">
                                HP {hp}/{HP_MAX}
                              </p>
                              <div className="p-1.5">
                                <HealthBar value={hp} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* The frame is drawn outside the buttons, so the row needs room for it */}
                      <div className="flex flex-wrap gap-6 p-1.5">
                        {hp === 0 && (
                          <Link
                            href={`/professor/turmas/${classId}/alunos/${id}/sorteio`}
                            className={linkButtonVariants({
                              variant: 'outline'
                            })}
                          >
                            Sortear consequência
                            <span className="sr-only">
                              {' '}
                              de {identifyStudent(name, email ?? username)}
                            </span>
                          </Link>
                        )}
                        <Link
                          href={`/professor/turmas/${classId}/historico?aluno=${id}`}
                          className={linkButtonVariants({ variant: 'outline' })}
                        >
                          Histórico
                          <span className="sr-only">
                            {' '}
                            de {identifyStudent(name, email ?? username)}
                          </span>
                        </Link>
                        <ConfirmActionDialog
                          triggerLabel={
                            <>
                              Remover
                              <span className="sr-only">
                                {' '}
                                {identifyStudent(name, email ?? username)}
                              </span>
                            </>
                          }
                          title="Remover aluno?"
                          description={`${identifyStudent(name, email ?? username)} sairá desta turma. A conta será mantida, e é possível voltar com um novo convite ou com o código da turma.`}
                          confirmLabel="Remover"
                          action={async () => {
                            const result = await removeAction(id)
                            // The student stays listed, so the message of an earlier removal would mislead
                            if (result.status === 'error')
                              setFeedback(IDLE_STATE)
                            return result
                          }}
                          onSuccess={setFeedback}
                        />
                      </div>
                    </li>
                  )
                )}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
      {students.length > 0 && (
        // Outside the card, or the bar would stop sticking at the card's edges
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 bg-background p-3">
          <p aria-live="polite" className="text-xs leading-relaxed">
            {selectedIds.length === 0
              ? 'Nenhum aluno selecionado'
              : `${selectedIds.length} ${selectedIds.length === 1 ? 'selecionado' : 'selecionados'}`}
          </p>
          <AwardBehaviorDialog
            classId={classId}
            selectedCount={selectedIds.length}
            behaviors={behaviors}
            onAward={award}
          />
        </div>
      )}
    </>
  )
}
