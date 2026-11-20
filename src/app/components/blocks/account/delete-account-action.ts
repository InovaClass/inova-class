'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { formAction, type FormState } from '@/entry/form-action'
import { requireSession } from '@/entry/session'
import { accountModel } from '@/models/account/model'
import type { DeleteAccountInput } from '@/models/account/schema'

// Both roles delete their account the same way, so the action isn't tied to a route
export const deleteAccount = async (
  input: DeleteAccountInput
): Promise<FormState<DeleteAccountInput>> =>
  formAction(input, async (values) => {
    const { user } = await requireSession()
    await accountModel.deleteOwn(user, values, { headers: await headers() })
    redirect('/entrar?conta=apagada')
  })

// An account without a password confirms in a dialog, which sends no fields
export const deleteAccountWithoutPassword = async (): Promise<FormState> =>
  formAction({}, async () => {
    const { user } = await requireSession()
    await accountModel.deleteOwn(user, {}, { headers: await headers() })
    redirect('/entrar?conta=apagada')
  })
