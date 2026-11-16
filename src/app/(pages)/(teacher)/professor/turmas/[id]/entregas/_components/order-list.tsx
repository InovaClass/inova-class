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

type RewardOrder = {
  id: string
  rewardName: string
  price: number
  date: string
  studentLabel: string
  studentLeft: boolean
}

type OrderListProps = {
  orders: RewardOrder[]
  deliverAction: (orderId: string) => Promise<FormState>
  cancelAction: (orderId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const OrderList = ({
  orders,
  deliverAction,
  cancelAction
}: OrderListProps) => {
  // Out here because the row leaves with the decision. This message also takes the focus, since the
  // button it was on is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)

  return (
    <div className="flex flex-col gap-6">
      <FormMessage state={feedback} />
      {orders.length === 0 ? (
        <Empty className="p-0 md:p-0">
          <EmptyHeader>
            <EmptyTitle className="text-sm leading-relaxed">
              Nenhuma entrega pendente
            </EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              Quando um aluno comprar uma recompensa, o pedido aparece aqui.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // Tailwind's `list-style: none` makes Safari drop the list semantics
        <ul role="list" className="flex flex-col gap-8">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2 text-xs leading-relaxed">
                <p className="wrap-anywhere">{order.rewardName}</p>
                <p className="wrap-anywhere">{order.studentLabel}</p>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                  <CoinCounter value={order.price} />
                  <span>{order.date}</span>
                  {order.studentLeft && (
                    <span className="text-foreground">Saiu da turma</span>
                  )}
                </p>
              </div>
              {/* The frame is drawn outside the buttons, so the row needs room for it */}
              <div className="flex flex-wrap gap-6 p-1.5">
                <ActionButton
                  variant="outline"
                  action={() => deliverAction(order.id)}
                  onResult={setFeedback}
                >
                  Entregar
                  <span className="sr-only">
                    {' '}
                    {order.rewardName} para {order.studentLabel}
                  </span>
                </ActionButton>
                <ConfirmActionDialog
                  triggerLabel={
                    <>
                      Cancelar
                      <span className="sr-only">
                        {' '}
                        {order.rewardName} de {order.studentLabel}
                      </span>
                    </>
                  }
                  title="Cancelar pedido?"
                  description={`${order.studentLabel} recebe de volta ${order.price === 1 ? 'a moeda paga' : `as ${order.price} moedas pagas`} por ${order.rewardName}.`}
                  confirmLabel="Cancelar pedido"
                  dismissLabel="Voltar"
                  action={async () => {
                    const result = await cancelAction(order.id)
                    // The order stays listed, so the message of an earlier decision would mislead
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
    </div>
  )
}
