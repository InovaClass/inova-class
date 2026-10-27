import { cn } from 'cn'
import type { Metadata } from 'next'
import Link from 'next/link'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { FormCard } from '@/app/components/ui/custom/form-card'

export const metadata: Metadata = { title: 'Criar conta' }

const SIGN_UP_OPTIONS = [
  { href: '/cadastro/professor', label: 'Sou professor' },
  { href: '/cadastro/aluno', label: 'Sou aluno' }
] as const

const RoleChoicePage = () => (
  <FormCard
    title="Criar conta"
    description="Escolha como você vai usar o inova.class."
    footer={
      <p>
        Já tem uma conta?{' '}
        <Link href="/entrar" className="underline underline-offset-4">
          Entrar
        </Link>
      </p>
    }
  >
    {/* Tailwind's `list-style: none` makes Safari drop the list semantics */}
    <ul role="list" className="flex flex-col gap-6">
      {SIGN_UP_OPTIONS.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            className={cn(
              linkButtonVariants({ variant: 'outline', size: 'lg' }),
              'w-full'
            )}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  </FormCard>
)

export default RoleChoicePage
