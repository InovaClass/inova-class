import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import { consequenceModel } from '@/models/consequence/model'

import { removeConsequence } from './_components/action'
import { ConsequenceList } from './_components/consequence-list'

export const metadata: Metadata = { title: 'Consequências' }

const ConsequencesPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/consequencias'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()
  const consequences = await consequenceModel.list(user.id, classId)

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
          <h1 className="text-sm leading-relaxed">Consequências</h1>
          <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
            {schoolClass.name}
          </p>
        </div>
        {/* The frame is drawn outside the link, so it needs room for it */}
        <div className="p-1.5">
          <Link
            href={`/professor/turmas/${classId}/consequencias/novo`}
            className={linkButtonVariants({ variant: 'outline' })}
          >
            Nova consequência
          </Link>
        </div>
      </header>
      <ConsequenceList
        classId={classId}
        consequences={consequences}
        removeAction={removeConsequence.bind(null, classId)}
      />
    </>
  )
}

export default ConsequencesPage
