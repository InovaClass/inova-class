import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { ChangePasswordForm } from '@/app/(pages)/(auth)/alterar-senha/_components/change-password-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { getSession } from '@/infra/session'

export const metadata: Metadata = { title: 'Alterar senha' }

const ChangePasswordPage = async () => {
  const session = await getSession()
  if (!session) redirect('/entrar')
  if (!session.user.mustChangePassword) redirect('/')

  return (
    <FormCard
      title="Alterar senha"
      description="Sua senha é temporária. Escolha uma nova senha para continuar."
    >
      <ChangePasswordForm
        username={session.user.username ?? session.user.email}
      />
    </FormCard>
  )
}

export default ChangePasswordPage
