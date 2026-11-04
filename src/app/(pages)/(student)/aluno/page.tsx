import type { Metadata } from 'next'

import { ClassSlots } from '@/app/components/blocks/class/class-slots'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { requireRole } from '@/entry/session'
import { enrollmentModel } from '@/models/enrollment/model'

import { JoinClassForm } from './_components/join-class-form'

export const metadata: Metadata = { title: 'Painel do aluno' }

const StudentDashboardPage = async () => {
  const { user } = await requireRole('student')
  const classes = await enrollmentModel.listClasses(user.id)

  return (
    <>
      <h1 className="text-sm leading-relaxed">Painel do aluno</h1>
      {classes.length > 0 ? (
        <ClassSlots classes={classes} />
      ) : (
        // Without `flex-none` it takes the free height and pushes the join form, the only action here, down
        <Empty className="flex-none">
          <EmptyHeader>
            <EmptyTitle>
              <h2 className="text-sm leading-relaxed">Nenhuma turma ainda</h2>
            </EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              Use o código que você recebeu na sala de aula para entrar em uma
              turma.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <section className="flex w-full max-w-md flex-col gap-4">
        <h2 className="text-sm leading-relaxed">Entrar em uma turma</h2>
        <JoinClassForm />
      </section>
    </>
  )
}

export default StudentDashboardPage
