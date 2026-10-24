'use client'

import { useActionState } from 'react'

import type { GoogleSignInState } from '@/app/(pages)/(auth)/_components/google-sign-in-action'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'

type GoogleSignInFormProps = {
  action: (
    state: GoogleSignInState,
    formData: FormData
  ) => Promise<GoogleSignInState>
  // A failed Google callback lands here too, so a new attempt replaces its message instead of
  // adding a second one
  notice?: GoogleSignInState
}

export const GoogleSignInForm = ({ action, notice }: GoogleSignInFormProps) => {
  const [state, dispatch, pending] = useActionState(
    action,
    notice ?? ({ status: 'idle' } as const)
  )

  return (
    <form action={dispatch} className="flex flex-col gap-6">
      <FormMessage state={state} />
      <SubmitButton pending={pending} variant="outline">
        Continuar com Google
      </SubmitButton>
    </form>
  )
}
