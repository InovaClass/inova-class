'use client'

import { cn } from 'cn'
import { useState } from 'react'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { ActionButton } from '@/app/components/ui/custom/action-button'
import { CoinCounter } from '@/app/components/ui/custom/coin-counter'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { FormState } from '@/entry/form-action'

type PowerListProps = {
  coins: number
  availableCoins: number
  pending: { id: string; powerName: string; cost: number }[]
  powers: {
    id: string
    name: string
    description: string | null
    cost: number
    minLevel: number
    unlocked: boolean
    requested: boolean
    affordable: boolean
  }[]
  requestAction: (powerId: string) => Promise<FormState>
  cancelAction: (requestId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

const powerStatusOf = (power: PowerListProps['powers'][number]) => {
  if (!power.unlocked) return `Disponível a partir do nível ${power.minLevel}`
  if (power.requested) return 'Pedido pendente'
  if (!power.affordable) return 'Moedas insuficientes'
}

export const PowerList = ({
  coins,
  availableCoins,
  pending,
  powers,
  requestAction,
  cancelAction
}: PowerListProps) => {
  // Out here because the row's button leaves once the request changes. This message also takes the
  // focus, since the button it was on is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)
  const reserved = coins - availableCoins

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm leading-relaxed">Poderes</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-xs leading-relaxed">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>Moedas disponíveis</span>
            <CoinCounter value={availableCoins} />
          </p>
          {reserved > 0 && (
            <p className="text-muted-foreground">
              {reserved}{' '}
              {reserved === 1 ? 'moeda reservada' : 'moedas reservadas'} em
              pedidos pendentes.
            </p>
          )}
        </div>
        <FormMessage state={feedback} />
        {pending.length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="text-xs leading-relaxed">Pedidos pendentes</h3>
            {/* Tailwind's `list-style: none` makes Safari drop the list semantics */}
            <ul role="list" className="flex flex-col gap-4">
              {pending.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <p className="flex min-w-0 flex-1 basis-48 flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-relaxed">
                    <span className="wrap-anywhere">{request.powerName}</span>
                    <CoinCounter
                      value={request.cost}
                      className="text-muted-foreground"
                    />
                  </p>
                  {/* The frame is drawn outside the button, so it needs room for it */}
                  <div className="p-1.5">
                    <ActionButton
                      variant="outline"
                      action={() => cancelAction(request.id)}
                      onResult={setFeedback}
                    >
                      Cancelar pedido
                      <span className="sr-only"> {request.powerName}</span>
                    </ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {powers.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sua classe ainda não tem poderes nesta turma.
          </p>
        ) : (
          // Tailwind's `list-style: none` makes Safari drop the list semantics
          <ul role="list" className="flex flex-col gap-6">
            {powers.map((power) => {
              const status = powerStatusOf(power)
              return (
                <li
                  key={power.id}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2">
                    <p
                      className={cn(
                        'text-xs leading-relaxed wrap-anywhere',
                        !power.unlocked && 'text-muted-foreground'
                      )}
                    >
                      {power.name}
                    </p>
                    {power.description && (
                      <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
                        {power.description}
                      </p>
                    )}
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-relaxed text-muted-foreground">
                      <CoinCounter value={power.cost} />
                      {status && <span>{status}</span>}
                    </p>
                  </div>
                  {!status && (
                    // The frame is drawn outside the button, so it needs room for it
                    <div className="p-1.5">
                      <ActionButton
                        action={() => requestAction(power.id)}
                        onResult={setFeedback}
                      >
                        Usar poder
                        <span className="sr-only"> {power.name}</span>
                      </ActionButton>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
