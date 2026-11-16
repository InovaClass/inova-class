'use client'

import { useState } from 'react'

import { ActionButton } from '@/app/components/ui/custom/action-button'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import type { FormState } from '@/entry/form-action'

type RankingVisibilityProps = {
  visible: boolean
  toggleAction: () => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const RankingVisibility = ({
  visible,
  toggleAction
}: RankingVisibilityProps) => {
  // The toggle keeps the focus, so its success is only announced: FormMessage would take the focus
  const [result, setResult] = useState<FormState>(IDLE_STATE)

  return (
    <div className="flex flex-col gap-4">
      <FormMessage state={result.status === 'error' ? result : IDLE_STATE} />
      <p aria-live="polite" className="sr-only">
        {result.status === 'success' && (
          <span key={result.id}>{result.message}</span>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-6">
        <p className="min-w-0 flex-1 basis-48 text-xs leading-relaxed text-muted-foreground">
          {visible
            ? 'Visível: os alunos veem o ranking na página da turma.'
            : 'Oculto: só você vê o ranking.'}
        </p>
        {/* The frame is drawn outside the button, so it needs room for it */}
        <div className="p-1.5">
          <ActionButton
            variant="outline"
            action={toggleAction}
            onResult={setResult}
          >
            {visible ? 'Ocultar dos alunos' : 'Mostrar aos alunos'}
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
