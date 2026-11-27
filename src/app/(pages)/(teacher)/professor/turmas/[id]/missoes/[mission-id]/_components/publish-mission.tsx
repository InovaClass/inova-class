'use client'

import { useState } from 'react'

import { ActionButton } from '@/app/components/ui/custom/action-button'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import type { FormState } from '@/entry/form-action'

type PublishMissionProps = {
  published: boolean
  publishAction: () => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

// Rendered either way, so the message outlives the button, which leaves once the mission is
// published. The message takes the focus the button had
export const PublishMission = ({
  published,
  publishAction
}: PublishMissionProps) => {
  const [result, setResult] = useState<FormState>(IDLE_STATE)

  return (
    <>
      <FormMessage state={result} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="min-w-0 flex-1 basis-48 text-xs leading-relaxed text-muted-foreground">
          {published
            ? 'Publicada: os alunos veem esta missão.'
            : 'Rascunho: os alunos ainda não veem esta missão. Depois de publicada, ela não volta a ser rascunho.'}
        </p>
        {!published && (
          // The frame is drawn outside the button, so it needs room for it
          <div className="p-1.5">
            <ActionButton
              pendingLabel="Publicando"
              action={publishAction}
              onResult={setResult}
            >
              Publicar missão
            </ActionButton>
          </div>
        )}
      </div>
    </>
  )
}
