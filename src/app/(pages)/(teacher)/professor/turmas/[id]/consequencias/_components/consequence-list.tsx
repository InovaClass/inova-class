'use client'

import Link from 'next/link'
import { useState } from 'react'

import { ConfirmActionDialog } from '@/app/(pages)/(teacher)/_components/confirm-action-dialog'
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

type ConsequenceListProps = {
  classId: string
  consequences: { id: string; name: string }[]
  removeAction: (consequenceId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const ConsequenceList = ({
  classId,
  consequences,
  removeAction
}: ConsequenceListProps) => {
  // Out here because the dialog leaves with its row. This message also takes the focus, since the
  // trigger the dialog would return it to is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)

  return (
    <>
      <FormMessage state={feedback} />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-sm leading-relaxed">Lista da turma</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {consequences.length === 0 ? (
            <Empty className="p-0 md:p-0">
              <EmptyHeader>
                <EmptyTitle className="text-sm leading-relaxed">
                  Nenhuma consequência
                </EmptyTitle>
                <EmptyDescription className="text-xs leading-relaxed">
                  Sem consequências, não há sorteio para quem ficar sem HP.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            // Tailwind's `list-style: none` makes Safari drop the list semantics
            <ul role="list" className="flex flex-col gap-6">
              {consequences.map(({ id, name }) => (
                <li
                  key={id}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <p className="min-w-0 flex-1 basis-48 text-xs leading-relaxed wrap-anywhere">
                    {name}
                  </p>
                  {/* The frame is drawn outside the buttons, so the row needs room for it */}
                  <div className="flex flex-wrap gap-6 p-1.5">
                    <Link
                      href={`/professor/turmas/${classId}/consequencias/${id}/editar`}
                      className={linkButtonVariants({ variant: 'outline' })}
                    >
                      Editar
                      <span className="sr-only"> {name}</span>
                    </Link>
                    <ConfirmActionDialog
                      triggerLabel={
                        <>
                          Remover
                          <span className="sr-only"> {name}</span>
                        </>
                      }
                      title="Remover consequência?"
                      description={`${name} sairá da lista da turma. Os sorteios já feitos continuam no histórico.`}
                      confirmLabel="Remover"
                      action={async () => {
                        const result = await removeAction(id)
                        // The consequence stays listed, so the message of an earlier removal would mislead
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
    </>
  )
}
