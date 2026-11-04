import type { Metadata } from 'next'
import Link from 'next/link'

import { ClassSlots } from '@/app/components/blocks/class/class-slots'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

export const metadata: Metadata = { title: 'Painel do professor' }

const NEW_CLASS_PATH = '/professor/turmas/nova'

const TeacherDashboardPage = async () => {
  const { user } = await requireRole('teacher')
  const classes = await classModel.list(user.id)

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-6">
        <h1 className="text-sm leading-relaxed">Painel do professor</h1>
        <div className="flex flex-wrap items-center gap-6 p-1.5">
          {/* Outside the empty state too: a teacher who archived every class still needs the way back */}
          <Link
            href="/professor/turmas/arquivadas"
            className={linkButtonVariants({ variant: 'outline' })}
          >
            Turmas arquivadas
          </Link>
          {classes.length > 0 && (
            <Link
              href={NEW_CLASS_PATH}
              className={linkButtonVariants({ variant: 'outline' })}
            >
              Nova turma
            </Link>
          )}
        </div>
      </header>
      {classes.length > 0 ? (
        <ClassSlots
          classes={classes}
          hrefOf={({ id }) => `/professor/turmas/${id}`}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              <h2 className="text-sm leading-relaxed">Nenhuma turma ainda</h2>
            </EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              Crie sua primeira turma para começar.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              href={NEW_CLASS_PATH}
              className={linkButtonVariants({ variant: 'outline' })}
            >
              Nova turma
            </Link>
          </EmptyContent>
        </Empty>
      )}
    </>
  )
}

export default TeacherDashboardPage
