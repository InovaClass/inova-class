'use client'

import { useState } from 'react'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { ActionButton } from '@/app/components/ui/custom/action-button'
import { CoinCounter } from '@/app/components/ui/custom/coin-counter'
import { ConfirmActionDialog } from '@/app/components/ui/custom/confirm-action-dialog'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import type { FormState } from '@/entry/form-action'

type PowerRequest = {
  id: string
  powerName: string
  cost: number
  date: string
  studentLabel: string
}

type RequestListProps = {
  requests: PowerRequest[]
  approveAction: (requestId: string) => Promise<FormState>
  refuseAction: (requestId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const RequestList = ({
  requests,
  approveAction,
  refuseAction
}: RequestListProps) => {
  // Out here because the row leaves with the decision. This message also takes the focus, since the
  // button it was on is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)

  return (
    <div className="flex flex-col gap-6">
      <FormMessage state={feedback} />
      {requests.length === 0 ? (
        <Empty className="p-0 md:p-0">
          <EmptyHeader>
            <EmptyTitle className="text-sm leading-relaxed">
              Nenhum pedido pendente
            </EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              Quando um aluno pedir para usar um poder, o pedido aparece aqui.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // Tailwind's `list-style: none` makes Safari drop the list semantics
        <ul role="list" className="flex flex-col gap-8">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2 text-xs leading-relaxed">
                <p className="wrap-anywhere">{request.powerName}</p>
                <p className="wrap-anywhere">{request.studentLabel}</p>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                  <CoinCounter value={request.cost} />
                  <span>{request.date}</span>
                </p>
              </div>
              {/* The frame is drawn outside the buttons, so the row needs room for it */}
              <div className="flex flex-wrap gap-6 p-1.5">
                {/* Confirmed, since a power entry can't be reversed from the history */}
                <ConfirmActionDialog
                  triggerLabel={
                    <>
                      Aprovar
                      <span className="sr-only">
                        {' '}
                        {request.powerName} de {request.studentLabel}
                      </span>
                    </>
                  }
                  title="Aprovar pedido?"
                  description={`${request.studentLabel} vai gastar ${request.cost} ${request.cost === 1 ? 'moeda' : 'moedas'} em ${request.powerName}. Não é possível reverter.`}
                  confirmLabel="Aprovar"
                  confirmPendingLabel="Aprovando"
                  confirmVariant="default"
                  action={async () => {
                    const result = await approveAction(request.id)
                    // The request stays listed, so the message of an earlier decision would mislead
                    if (result.status === 'error') setFeedback(IDLE_STATE)
                    return result
                  }}
                  onSuccess={setFeedback}
                />
                <ActionButton
                  pendingLabel="Recusando"
                  variant="outline"
                  action={() => refuseAction(request.id)}
                  onResult={setFeedback}
                >
                  Recusar
                  <span className="sr-only">
                    {' '}
                    {request.powerName} de {request.studentLabel}
                  </span>
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
