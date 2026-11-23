import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import { missionModel } from '@/models/mission/model'

import { removeMission } from './_components/action'
import { MissionList } from './_components/mission-list'

export const metadata: Metadata = { title: 'Missões' }

const MissionsPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/missoes'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()
  const missions = await missionModel.list(user.id, classId)

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
          <h1 className="text-sm leading-relaxed">Missões</h1>
          <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
            {schoolClass.name}
          </p>
        </div>
        {/* The frame is drawn outside the link, so it needs room for it */}
        <div className="p-1.5">
          <Link
            href={`/professor/turmas/${classId}/missoes/nova`}
            className={linkButtonVariants({ variant: 'outline' })}
          >
            Nova missão
          </Link>
        </div>
      </header>
      <MissionList
        classId={classId}
        missions={missions}
        removeAction={removeMission.bind(null, classId)}
      />
    </>
  )
}

export default MissionsPage
