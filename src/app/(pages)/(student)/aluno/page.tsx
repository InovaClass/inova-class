import type { Metadata } from 'next'

import { requireRole } from '@/entry/session'

import { JoinClassForm } from './_components/join-class-form'

export const metadata: Metadata = { title: 'Painel do aluno' }

const StudentDashboardPage = async () => {
  await requireRole('student')

  return (
    <>
      <h1 className="text-sm leading-relaxed">Painel do aluno</h1>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Suas turmas aparecerão aqui.
      </p>
      <section className="flex w-full max-w-md flex-col gap-4">
        <h2 className="text-sm leading-relaxed">Entrar em uma turma</h2>
        <JoinClassForm />
      </section>
    </>
  )
}

export default StudentDashboardPage
