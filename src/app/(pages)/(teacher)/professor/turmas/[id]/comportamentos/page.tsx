import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { requireRole } from '@/entry/session'
import { behaviorModel } from '@/models/behavior/model'
import { classModel } from '@/models/class/model'

import { removeBehavior } from './_components/action'
import { BehaviorList } from './_components/behavior-list'

export const metadata: Metadata = { title: 'Comportamentos' }

const BehaviorsPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/comportamentos'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()
  const behaviors = await behaviorModel.list(user.id, classId)

  return (
    <>
      <Link
        href={`/professor/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
          <h1 className="text-sm leading-relaxed">Comportamentos</h1>
          <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
            {schoolClass.name}
          </p>
        </div>
        {/* The frame is drawn outside the link, so it needs room for it */}
        <div className="p-1.5">
          <Link
            href={`/professor/turmas/${classId}/comportamentos/novo`}
            className={linkButtonVariants({ variant: 'outline' })}
          >
            Novo comportamento
          </Link>
        </div>
      </header>
      <BehaviorList
        classId={classId}
        groups={[
          {
            title: 'Positivos',
            empty: {
              title: 'Nenhum comportamento positivo',
              description: 'Crie um para dar XP, HP ou moedas aos alunos.'
            },
            behaviors: behaviors.filter(({ kind }) => kind === 'positive')
          },
          {
            title: 'Negativos',
            empty: {
              title: 'Nenhum comportamento negativo',
              description: 'Crie um para tirar HP ou moedas dos alunos.'
            },
            behaviors: behaviors.filter(({ kind }) => kind === 'negative')
          }
        ]}
        removeAction={removeBehavior.bind(null, classId)}
      />
    </>
  )
}

export default BehaviorsPage
