import type { Metadata } from 'next'
import Link from 'next/link'

import { SignUpForm } from '@/app/(pages)/(auth)/cadastro/_components/sign-up-form'
import { FormCard } from '@/app/components/ui/custom/form-card'

export const metadata: Metadata = { title: 'Criar conta' }

const SignUpPage = () => (
  <FormCard
    title="Criar conta"
    description="Cadastre-se como professor para criar e gerenciar suas turmas."
    footer={
      <p>
        Já tem uma conta?{' '}
        <Link href="/entrar" className="underline underline-offset-4">
          Entrar
        </Link>
      </p>
    }
  >
    <SignUpForm />
  </FormCard>
)

export default SignUpPage
