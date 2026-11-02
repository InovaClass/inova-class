import type { Metadata } from 'next'
import Link from 'next/link'

import { FormCard } from '@/app/components/ui/custom/form-card'

import { ForgotPasswordForm } from './_components/forgot-password-form'

export const metadata: Metadata = { title: 'Esqueci minha senha' }

const ForgotPasswordPage = () => (
  <FormCard
    title="Esqueci minha senha"
    description="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
    footer={
      <p>
        Lembrou a senha?{' '}
        <Link href="/entrar" className="underline underline-offset-4">
          Entrar
        </Link>
      </p>
    }
  >
    <ForgotPasswordForm />
  </FormCard>
)

export default ForgotPasswordPage
