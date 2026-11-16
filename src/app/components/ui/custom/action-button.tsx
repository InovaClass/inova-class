'use client'

import { type ComponentProps, useActionState } from 'react'

import type { FormState } from '@/entry/form-action'

import { SubmitButton } from './submit-button'

const IDLE_STATE: FormState = { status: 'idle' }

type ActionButtonProps = Omit<
  ComponentProps<typeof SubmitButton>,
  'pending'
> & {
  action: () => Promise<FormState>
  onResult: (result: FormState) => void
}

// The result goes to the caller, since a list shows one message for all its rows and a row's button
// may leave with the change
export const ActionButton = ({
  action,
  onResult,
  ...props
}: ActionButtonProps) => {
  const [, dispatch, pending] = useActionState(async () => {
    const result = await action()
    onResult(result)
    return result
  }, IDLE_STATE)

  return (
    <form action={dispatch}>
      <SubmitButton pending={pending} {...props} />
    </form>
  )
}
