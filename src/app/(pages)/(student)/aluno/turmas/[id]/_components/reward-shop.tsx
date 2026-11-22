'use client'

import { useState } from 'react'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { CoinCounter } from '@/app/components/ui/custom/coin-counter'
import { ConfirmActionDialog } from '@/app/components/ui/custom/confirm-action-dialog'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { RewardOrderStatus } from '@/constants/game'
import type { FormState } from '@/entry/form-action'

type RewardShopProps = {
  availableCoins: number
  reservedCoins: number
  rewards: {
    id: string
    name: string
    description: string | null
    price: number
    stock: number | null
    soldOut: boolean
    affordable: boolean
  }[]
  orders: {
    id: string
    rewardName: string
    price: number
    status: RewardOrderStatus
    date: string
  }[]
  purchaseAction: (rewardId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

const ORDER_STATUS_LABELS: Record<RewardOrderStatus, string> = {
  pending: 'Aguardando entrega',
  delivered: 'Entregue',
  canceled: 'Cancelado, moedas devolvidas'
}

const rewardStatusOf = (reward: RewardShopProps['rewards'][number]) => {
  if (reward.soldOut) return 'Esgotada'
  if (!reward.affordable) return 'Moedas insuficientes'
}

export const RewardShop = ({
  availableCoins,
  reservedCoins,
  rewards,
  orders,
  purchaseAction
}: RewardShopProps) => {
  // Out here so one message serves every row, and the focus it takes survives a button that leaves
  // when the reward sells out or the coins run short
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm leading-relaxed">Loja</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-xs leading-relaxed">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>Moedas disponíveis</span>
            <CoinCounter value={availableCoins} />
          </p>
          {reservedCoins > 0 && (
            <p className="text-muted-foreground">
              {reservedCoins}{' '}
              {reservedCoins === 1 ? 'moeda reservada' : 'moedas reservadas'} em
              pedidos de poderes.
            </p>
          )}
        </div>
        <FormMessage state={feedback} />
        {rewards.length === 0 ? (
          <Empty className="p-0 md:p-0">
            <EmptyHeader>
              <EmptyTitle className="text-sm leading-relaxed">
                Nenhuma recompensa
              </EmptyTitle>
              <EmptyDescription className="text-xs leading-relaxed">
                O professor ainda não colocou recompensas na loja.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          // Tailwind's `list-style: none` makes Safari drop the list semantics
          <ul role="list" className="flex flex-col gap-6">
            {rewards.map((reward) => {
              const status = rewardStatusOf(reward)
              return (
                <li
                  key={reward.id}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2">
                    <p className="text-xs leading-relaxed wrap-anywhere">
                      {reward.name}
                    </p>
                    {reward.description && (
                      <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
                        {reward.description}
                      </p>
                    )}
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-relaxed text-muted-foreground">
                      <CoinCounter value={reward.price} />
                      {reward.stock !== null && reward.stock > 0 && (
                        <span>
                          {reward.stock === 1
                            ? 'Última unidade'
                            : `${reward.stock} unidades`}
                        </span>
                      )}
                      {status && <span>{status}</span>}
                    </p>
                  </div>
                  {!status && (
                    // The frame is drawn outside the button, so it needs room for it
                    <div className="p-1.5">
                      {/* Confirmed, since only the teacher can cancel an order and refund it */}
                      <ConfirmActionDialog
                        triggerLabel={
                          <>
                            Comprar
                            <span className="sr-only"> {reward.name}</span>
                          </>
                        }
                        title="Comprar recompensa?"
                        description={`Você vai gastar ${reward.price} ${reward.price === 1 ? 'moeda' : 'moedas'} em ${reward.name}. Só o professor pode cancelar o pedido e devolver as moedas.`}
                        confirmLabel="Comprar"
                        confirmVariant="default"
                        action={async () => {
                          const result = await purchaseAction(reward.id)
                          // The reward stays listed, so the message of an earlier purchase would mislead
                          if (result.status === 'error') setFeedback(IDLE_STATE)
                          return result
                        }}
                        onSuccess={setFeedback}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {orders.length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="text-xs leading-relaxed">Meus pedidos</h3>
            {/* Tailwind's `list-style: none` makes Safari drop the list semantics */}
            <ul role="list" className="flex flex-col gap-4">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-col gap-2 text-xs leading-relaxed"
                >
                  <p className="wrap-anywhere">{order.rewardName}</p>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                    <CoinCounter value={order.price} />
                    <span>{order.date}</span>
                    <span>{ORDER_STATUS_LABELS[order.status]}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
