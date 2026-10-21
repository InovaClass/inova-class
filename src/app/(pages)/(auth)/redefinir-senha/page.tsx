import type { Metadata } from 'next'
import Link from 'next/link'

import { ResetPasswordForm } from '@/app/(pages)/(auth)/redefinir-senha/_components/reset-password-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { formError } from '@/infra/form-action'
import { authErrorFromCode } from '@/models/authentication-model/errors'

export const metadata: Metadata = { title: 'Redefinir senha' }

const ResetPasswordPage = async ({
  searchParams
}: PageProps<'/redefinir-senha'>) => {
  const { token, error } = await searchParams

  return (
    <FormCard
      title="Redefinir senha"
      description="Escolha uma nova senha para sua conta."
      footer={
        <Link href="/esqueci-a-senha" className="underline underline-offset-4">
          Pedir um novo link
        </Link>
      }
    >
      {typeof token === 'string' ? (
        <ResetPasswordForm token={token} />
      ) : (
        <FormMessage
          state={formError(
            authErrorFromCode(typeof error === 'string' ? error : undefined)
          )}
        />
      )}
    </FormCard>
  )
}

export default ResetPasswordPage
