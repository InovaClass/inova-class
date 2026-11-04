'use client'

import { useState } from 'react'

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

import { ConfirmActionDialog } from './confirm-action-dialog'

type StudentRosterProps = {
  students: {
    id: string
    name: string
    username: string | null
    pending: boolean
    email?: string
  }[]
  removeAction: (studentId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

const identify = (name: string, detail?: string | null) =>
  detail ? `${name} (${detail})` : name

export const StudentRoster = ({
  students,
  removeAction
}: StudentRosterProps) => {
  // Out here because the dialog leaves with its row. This message also takes the focus, since the
  // trigger the dialog would return it to is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)

  return (
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
          // Tailwind's `list-style: none` makes Safari drop the list semantics
          <ul role="list" className="flex flex-col gap-6">
            {students.map(({ id, name, username, pending, email }) => (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2">
                  <p className="text-xs leading-relaxed wrap-anywhere">
                    {name}
                  </p>
                  {(pending || username) && (
                    <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
                      {pending ? `Convite pendente: ${email}` : username}
                    </p>
                  )}
                </div>
                {/* The frame is drawn outside the button, so it needs room for it */}
                <div className="p-1.5">
                  <ConfirmActionDialog
                    triggerLabel={
                      <>
                        Remover
                        <span className="sr-only">
                          {' '}
                          {identify(name, email ?? username)}
                        </span>
                      </>
                    }
                    title="Remover aluno?"
                    description={`${identify(name, email ?? username)} sairá desta turma. A conta será mantida, e é possível voltar com um novo convite ou com o código da turma.`}
                    confirmLabel="Remover"
                    action={async () => {
                      const result = await removeAction(id)
                      // The student stays listed, so the message of an earlier removal would mislead
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
  )
}
