'use client'

import { useActionState } from 'react'

import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'

import { signOut } from './sign-out-action'

export const SignOutForm = () => {
  const [state, dispatch, pending] = useActionState(signOut, {
    status: 'idle'
  })

  return (
    <form action={dispatch} className="flex flex-wrap justify-end gap-4">
      <FormMessage state={state} />
      <SubmitButton pending={pending} variant="outline" size="sm">
        Sair
      </SubmitButton>
    </form>
  )
}
