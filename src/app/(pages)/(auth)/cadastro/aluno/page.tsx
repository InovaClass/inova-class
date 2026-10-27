import type { Metadata } from 'next'
import Link from 'next/link'

import { signUpStudentWithGoogle } from '@/app/(pages)/(auth)/_components/google-sign-in-action'
import { GoogleSignInForm } from '@/app/(pages)/(auth)/_components/google-sign-in-form'
import { StudentSignUpForm } from '@/app/(pages)/(auth)/cadastro/aluno/_components/student-sign-up-form'
import { googleNoticeFrom } from '@/app/(pages)/(auth)/google-notice'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { isGoogleSignInEnabled } from '@/infra/auth'

export const metadata: Metadata = { title: 'Criar conta de aluno' }

const StudentSignUpPage = async ({
  searchParams
}: PageProps<'/cadastro/aluno'>) => {
  const googleNotice = googleNoticeFrom(await searchParams)

  return (
    <FormCard
      title="Criar conta de aluno"
      description="Cadastre-se para entrar nas turmas dos seus professores."
      footer={
        <p>
          Já tem uma conta?{' '}
          <Link href="/entrar" className="underline underline-offset-4">
            Entrar
          </Link>
        </p>
      }
    >
      <StudentSignUpForm>
        {isGoogleSignInEnabled && (
          <GoogleSignInForm
            action={signUpStudentWithGoogle}
            notice={googleNotice}
          />
        )}
      </StudentSignUpForm>
    </FormCard>
  )
}

export default StudentSignUpPage
