import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { SignInForm } from '@/app/(pages)/(auth)/entrar/_components/sign-in-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { formError, type FormState, formSuccess } from '@/infra/form-action'
import { getSession } from '@/infra/session'
import { authErrorFromCode } from '@/models/authentication-model/errors'

export const metadata: Metadata = { title: 'Entrar' }

const noticeFrom = ({
  error,
  senha
}: Record<string, string | string[] | undefined>):
  FormState<never> | undefined => {
  if (typeof error === 'string') {
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

  return (
    <FormCard
      title="Entrar"
      description="Acesse sua conta de professor."
      footer={
        <p>
          Ainda não tem uma conta?{' '}
          <Link href="/cadastro" className="underline underline-offset-4">
            Criar conta
          </Link>
        </p>
      }
    >
      <SignInForm notice={noticeFrom(await searchParams)} />
    </FormCard>
  )
}

export default SignInPage
