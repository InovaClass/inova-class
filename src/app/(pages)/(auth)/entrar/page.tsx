import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { signInWithGoogle } from '@/app/(pages)/(auth)/_components/google-sign-in-action'
import { GoogleSignInForm } from '@/app/(pages)/(auth)/_components/google-sign-in-form'
import { SignInForm } from '@/app/(pages)/(auth)/entrar/_components/sign-in-form'
import { googleNoticeFrom } from '@/app/(pages)/(auth)/google-notice'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { isGoogleSignInEnabled } from '@/infra/auth'
import { formError, type FormState, formSuccess } from '@/infra/form-action'
import { getSession } from '@/infra/session'
import { authErrorFromCode } from '@/models/authentication-model/errors'

export const metadata: Metadata = { title: 'Entrar' }

type SearchParams = Record<string, string | string[] | undefined>

const noticeFrom = ({
  error,
  origem,
  senha
}: SearchParams): FormState<never> | undefined => {
  if (typeof error === 'string' && origem !== 'google') {
    return formError(authErrorFromCode(error))
  }
  if (senha === 'redefinida') {
    return formSuccess('Senha redefinida. Entre com a nova senha.')
  }
}

const SignInPage = async ({ searchParams }: PageProps<'/entrar'>) => {
  // The email verification link signs the user in and lands here (#3)
  const session = await getSession()
  if (session) redirect('/')
  const params = await searchParams

  return (
    <FormCard
      title="Entrar"
      description="Acesse sua conta de professor ou aluno."
      footer={
        <p>
          Ainda não tem uma conta?{' '}
          <Link href="/cadastro" className="underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-6">
        <SignInForm notice={noticeFrom(params)} />
        {isGoogleSignInEnabled && (
          <GoogleSignInForm
            action={signInWithGoogle}
            notice={googleNoticeFrom(params)}
          />
        )}
      </div>
    </FormCard>
  )
}

export default SignInPage
