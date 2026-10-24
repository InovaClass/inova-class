import type { Metadata } from 'next'
import Link from 'next/link'

import { signUpWithGoogle } from '@/app/(pages)/(auth)/_components/google-sign-in-action'
import { GoogleSignInForm } from '@/app/(pages)/(auth)/_components/google-sign-in-form'
import { SignUpForm } from '@/app/(pages)/(auth)/cadastro/_components/sign-up-form'
import { googleNoticeFrom } from '@/app/(pages)/(auth)/google-notice'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { isGoogleSignInEnabled } from '@/infra/auth'

export const metadata: Metadata = { title: 'Criar conta' }

const SignUpPage = async ({ searchParams }: PageProps<'/cadastro'>) => {
  const googleNotice = googleNoticeFrom(await searchParams)

  return (
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
      <SignUpForm>
        {isGoogleSignInEnabled && (
          <GoogleSignInForm action={signUpWithGoogle} notice={googleNotice} />
        )}
      </SignUpForm>
    </FormCard>
  )
}

export default SignUpPage
