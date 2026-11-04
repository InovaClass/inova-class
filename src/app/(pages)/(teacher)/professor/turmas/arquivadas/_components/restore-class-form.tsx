'use client'

import { useActionState } from 'react'

import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import type { FormState } from '@/entry/form-action'

type RestoreClassFormProps = {
  name: string
  action: () => Promise<FormState>
}

export const RestoreClassForm = ({ name, action }: RestoreClassFormProps) => {
  const [state, dispatch, pending] = useActionState(action, {
    status: 'idle'
  } as const)

  return (
    <form action={dispatch} className="flex flex-col items-start gap-4">
      <FormMessage state={state} />
      {/* The frame is drawn outside the button, so it needs room for it */}
      <div className="p-1.5">
        <SubmitButton pending={pending} variant="outline">
          Restaurar
          <span className="sr-only"> {name}</span>
        </SubmitButton>
      </div>
    </form>
  )
}
