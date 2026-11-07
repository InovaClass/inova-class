'use client'

import Link from 'next/link'
import { useState } from 'react'

import { ConfirmActionDialog } from '@/app/(pages)/(teacher)/_components/confirm-action-dialog'
import { describeBehaviorValues } from '@/app/(pages)/(teacher)/professor/turmas/[id]/comportamentos/behavior-values'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { FormState } from '@/entry/form-action'

type BehaviorListProps = {
  classId: string
  groups: {
    title: string
    empty: { title: string; description: string }
    behaviors: {
      id: string
      name: string
      xp: number
      hp: number
      coins: number
    }[]
  }[]
  removeAction: (behaviorId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const BehaviorList = ({
  classId,
  groups,
  removeAction
}: BehaviorListProps) => {
  // Out here because the dialog leaves with its row, and above the cards so a removal from each one
  // shows a single message. It also takes the focus, since the trigger the dialog would return it to
  // is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)

  return (
    <>
      <FormMessage state={feedback} />
      {groups.map(({ title, empty, behaviors }) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle>
              <h2 className="text-sm leading-relaxed">{title}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {behaviors.length === 0 ? (
              <Empty className="p-0 md:p-0">
                <EmptyHeader>
                  <EmptyTitle className="text-sm leading-relaxed">
                    {empty.title}
                  </EmptyTitle>
                  <EmptyDescription className="text-xs leading-relaxed">
                    {empty.description}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              // Tailwind's `list-style: none` makes Safari drop the list semantics
              <ul role="list" className="flex flex-col gap-6">
                {behaviors.map((behavior) => (
                  <li
                    key={behavior.id}
                    className="flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2">
                      <p className="text-xs leading-relaxed wrap-anywhere">
                        {behavior.name}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {describeBehaviorValues(behavior)}
                      </p>
                    </div>
                    {/* The frame is drawn outside the buttons, so the row needs room for it */}
                    <div className="flex flex-wrap gap-6 p-1.5">
                      <Link
                        href={`/professor/turmas/${classId}/comportamentos/${behavior.id}/editar`}
                        className={linkButtonVariants({ variant: 'outline' })}
                      >
                        Editar
                        <span className="sr-only"> {behavior.name}</span>
                      </Link>
                      <ConfirmActionDialog
                        triggerLabel={
                          <>
                            Remover
                            <span className="sr-only"> {behavior.name}</span>
                          </>
                        }
                        title="Remover comportamento?"
                        description={`${behavior.name} sairá da lista da turma. Os pontos já dados por ele continuam valendo.`}
                        confirmLabel="Remover"
                        action={async () => {
                          const result = await removeAction(behavior.id)
                          // The behavior stays listed, so the message of an earlier removal would mislead
                          if (result.status === 'error') setFeedback(IDLE_STATE)
                          return result
                        }}
                        onSuccess={setFeedback}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  )
}
