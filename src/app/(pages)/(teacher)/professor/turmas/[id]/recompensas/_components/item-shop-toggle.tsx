'use client'

import { useState } from 'react'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { ActionButton } from '@/app/components/ui/custom/action-button'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { FormState } from '@/entry/form-action'

type ItemShopToggleProps = {
  enabled: boolean
  toggleAction: () => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const ItemShopToggle = ({
  enabled,
  toggleAction
}: ItemShopToggleProps) => {
  // The toggle keeps the focus, so its success is only announced: FormMessage would take the focus
  const [result, setResult] = useState<FormState>(IDLE_STATE)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm leading-relaxed">Loja de itens</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormMessage state={result.status === 'error' ? result : IDLE_STATE} />
        <p aria-live="polite" className="sr-only">
          {result.status === 'success' && (
            <span key={result.id}>{result.message}</span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <p className="min-w-0 flex-1 basis-48 text-xs leading-relaxed text-muted-foreground">
            {enabled
              ? 'Aberta: os alunos compram itens para o personagem com as moedas da turma.'
              : 'Fechada: os alunos só usam os itens que já têm.'}
          </p>
          {/* The frame is drawn outside the button, so it needs room for it */}
          <div className="p-1.5">
            <ActionButton
              pendingLabel={enabled ? 'Fechando loja' : 'Abrindo loja'}
              variant="outline"
              action={toggleAction}
              onResult={setResult}
            >
              {enabled ? 'Fechar loja de itens' : 'Abrir loja de itens'}
            </ActionButton>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
