import type { Metadata } from 'next'
import Link from 'next/link'

import { signUpTeacherWithGoogle } from '@/app/(pages)/(auth)/_components/google-sign-in-action'
import { GoogleSignInForm } from '@/app/(pages)/(auth)/_components/google-sign-in-form'
import { SignUpForm } from '@/app/(pages)/(auth)/cadastro/professor/_components/sign-up-form'
import { googleNoticeFrom } from '@/app/(pages)/(auth)/google-notice'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { isGoogleSignInEnabled } from '@/infra/auth'

export const metadata: Metadata = { title: 'Criar conta de professor' }

const TeacherSignUpPage = async ({
  searchParams
}: PageProps<'/cadastro/professor'>) => {
  const googleNotice = googleNoticeFrom(await searchParams)

  return (
    <FormCard
      title="Criar conta de professor"
      description="Cadastre-se para criar e gerenciar suas turmas."
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
          <GoogleSignInForm
            action={signUpTeacherWithGoogle}
            notice={googleNotice}
          />
        )}
      </SignUpForm>
    </FormCard>
  )
}

export default TeacherSignUpPage
