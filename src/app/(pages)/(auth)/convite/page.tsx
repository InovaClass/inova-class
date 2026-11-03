import type { Metadata } from 'next'
import Link from 'next/link'

import { TermsCheckboxLabel } from '@/app/(pages)/(auth)/_components/terms-consent'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { formError } from '@/entry/form-action'
import { invalidInvite } from '@/models/student/errors'
import { studentModel } from '@/models/student/model'

import { AcceptInviteForm } from './_components/accept-invite-form'

export const metadata: Metadata = { title: 'Criar senha' }

const InvitePage = async ({ searchParams }: PageProps<'/convite'>) => {
  const { token } = await searchParams
  const invite =
    typeof token === 'string' ? await studentModel.findInvite(token) : undefined

  return (
    <FormCard
      title="Criar senha"
      description="Crie uma senha para entrar no inova.class."
      footer={
        <Link href="/esqueci-a-senha" className="underline underline-offset-4">
          Pedir um novo link
        </Link>
      }
    >
      {typeof token === 'string' && invite ? (
        <AcceptInviteForm
          token={token}
          username={invite.username}
          termsLabel={<TermsCheckboxLabel />}
        />
      ) : (
        <FormMessage state={formError(invalidInvite())} />
      )}
    </FormCard>
  )
}

export default InvitePage
