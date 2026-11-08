'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { describeBehaviorValues } from '@/app/(pages)/(teacher)/professor/turmas/[id]/comportamentos/behavior-values'
import { Button, linkButtonVariants } from '@/app/components/ui/8bit/button'
import { DialogContent } from '@/app/components/ui/8bit/dialog'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/app/components/ui/shadcn/dialog'
import type { FormState } from '@/entry/form-action'

export type BehaviorOption = {
  id: string
  name: string
  xp: number
  hp: number
  coins: number
  kind: 'positive' | 'negative'
}

type AwardBehaviorDialogProps = {
  classId: string
  selectedCount: number
  behaviors: BehaviorOption[]
  onAward: (behaviorId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

const GROUPS = [
  { kind: 'positive', title: 'Positivos' },
  { kind: 'negative', title: 'Negativos' }
] as const

export const AwardBehaviorDialog = ({
  classId,
  selectedCount,
  behaviors,
  onAward
}: AwardBehaviorDialogProps) => {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<FormState>(IDLE_STATE)
  // An award clears the selection while the popup is still animating out
  const [targetCount, setTargetCount] = useState(selectedCount)
  const [pending, startTransition] = useTransition()

  const handleOpenChange = (nextOpen: boolean) => {
    // The award can't be cancelled, so closing now would look like a cancel while it still goes through
    if (pending) return
    setOpen(nextOpen)
    setState(IDLE_STATE)
  }

  const award = (behaviorId: string) => {
    startTransition(async () => {
      const result = await onAward(behaviorId)
      if (result.status === 'success') setOpen(false)
      setState(result.status === 'success' ? IDLE_STATE : result)
    })
  }

  return (
    <>
      {/* Not a Dialog.Trigger nor natively disabled: an award clears the selection, and the focus
      returns here when the dialog closes */}
      <Button
        aria-haspopup="dialog"
        disabled={selectedCount === 0}
        focusableWhenDisabled
        onClick={() => {
          setTargetCount(selectedCount)
          setOpen(true)
        }}
        className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        Aplicar comportamento
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm leading-relaxed">
              Aplicar comportamento
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {targetCount === 1
                ? 'O aluno selecionado receberá o comportamento escolhido.'
                : `Os ${targetCount} alunos selecionados receberão o comportamento escolhido.`}
            </DialogDescription>
          </DialogHeader>
          <FormMessage state={state} />
          {/* Not every screen reader voices aria-disabled on the focused button */}
          <p role="status" className="sr-only">
            {pending ? 'Aplicando comportamento…' : ''}
          </p>
          {behaviors.length === 0 && (
            <div className="p-1.5">
              <Link
                href={`/professor/turmas/${classId}/comportamentos`}
                className={linkButtonVariants({ variant: 'outline' })}
              >
                Criar comportamentos
              </Link>
            </div>
          )}
          {GROUPS.map(({ kind, title }) => {
            const group = behaviors.filter((behavior) => behavior.kind === kind)
            if (group.length === 0) return null
            return (
              <section key={kind} className="flex flex-col gap-4">
                <h3 className="text-xs leading-relaxed">{title}</h3>
                {/* Tailwind's `list-style: none` makes Safari drop the list semantics */}
                <ul role="list" className="flex flex-col gap-4 p-1.5">
                  {group.map((behavior) => (
                    <li key={behavior.id}>
                      <Button
                        variant="outline"
                        disabled={pending}
                        focusableWhenDisabled
                        onClick={() => award(behavior.id)}
                        className="h-auto w-full flex-col items-start gap-2 p-3 text-left whitespace-normal aria-disabled:pointer-events-none aria-disabled:opacity-50"
                      >
                        <span className="text-xs leading-relaxed wrap-anywhere">
                          {behavior.name}
                        </span>
                        <span className="text-xs leading-relaxed text-muted-foreground">
                          {describeBehaviorValues(behavior)}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          <div className="p-1.5">
            <DialogClose render={<Button variant="ghost" />} disabled={pending}>
              Cancelar
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
