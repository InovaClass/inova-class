'use client'

import Link from 'next/link'
import { useState } from 'react'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { CoinCounter } from '@/app/components/ui/custom/coin-counter'
import { ConfirmActionDialog } from '@/app/components/ui/custom/confirm-action-dialog'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import type { FormState } from '@/entry/form-action'

type Reward = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number | null
}

type RewardListProps = {
  classId: string
  rewards: Reward[]
  removeAction: (rewardId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

const stockLabelOf = (stock: number | null) => {
  if (stock === null) return 'Sem limite de estoque'
  if (stock === 0) return 'Esgotada'
  return `${stock} ${stock === 1 ? 'unidade' : 'unidades'} em estoque`
}

export const RewardList = ({
  classId,
  rewards,
  removeAction
}: RewardListProps) => {
  // Out here because the dialog leaves with its row. This message also takes the focus, since the
  // trigger the dialog would return it to is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)

  return (
    <div className="flex flex-col gap-6">
      <FormMessage state={feedback} />
      {rewards.length === 0 ? (
        <Empty className="p-0 md:p-0">
          <EmptyHeader>
            <EmptyTitle className="text-sm leading-relaxed">
              Nenhuma recompensa
            </EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              Crie uma recompensa para os alunos gastarem as moedas.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // Tailwind's `list-style: none` makes Safari drop the list semantics
        <ul role="list" className="flex flex-col gap-8">
          {rewards.map((reward) => (
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
                  <span>{stockLabelOf(reward.stock)}</span>
                </p>
              </div>
              {/* The frame is drawn outside the buttons, so the row needs room for it */}
              <div className="flex flex-wrap gap-6 p-1.5">
                <Link
                  href={`/professor/turmas/${classId}/recompensas/${reward.id}/editar`}
                  className={linkButtonVariants({ variant: 'outline' })}
                >
                  Editar
                  <span className="sr-only"> {reward.name}</span>
                </Link>
                <ConfirmActionDialog
                  triggerLabel={
                    <>
                      Remover
                      <span className="sr-only"> {reward.name}</span>
                    </>
                  }
                  title="Remover recompensa?"
                  description={`${reward.name} sairá da loja da turma. Os pedidos pendentes continuam em Entregas.`}
                  confirmLabel="Remover"
                  action={async () => {
                    const result = await removeAction(reward.id)
                    // The reward stays listed, so the message of an earlier removal would mislead
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
