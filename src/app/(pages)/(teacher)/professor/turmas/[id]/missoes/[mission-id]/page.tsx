import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { requireRole } from '@/entry/session'
import { missionModel } from '@/models/mission/model'

import {
  moveObjective,
  publishMission,
  removeObjective
} from './_components/action'
import { ObjectiveList } from './_components/objective-list'
import { PublishMission } from './_components/publish-mission'

export const metadata: Metadata = { title: 'Missão' }

const MissionPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/missoes/[mission-id]'>) => {
  const { id: classId, 'mission-id': missionId } = await params
  const { user } = await requireRole('teacher')
  const mission = await missionModel.findOwned(user.id, classId, missionId)
  if (!mission) notFound()
  const objectives = await missionModel.listObjectives(
    user.id,
    classId,
    missionId
  )
  const objectivesPath = `/professor/turmas/${classId}/missoes/${missionId}/objetivos`

  return (
    <>
      <Link
        href={`/professor/turmas/${classId}/missoes`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar às missões
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
          <h1 className="text-sm leading-relaxed wrap-anywhere">
            {mission.name}
          </h1>
          {mission.description && (
            <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
              {mission.description}
            </p>
          )}
        </div>
        {/* The frame is drawn outside the links, so they need room for it */}
        <div className="flex flex-wrap gap-6 p-1.5">
          <Link
            href={`${objectivesPath}/novo`}
            className={linkButtonVariants({ variant: 'outline' })}
          >
            Novo objetivo
          </Link>
          <Link
            href={`/professor/turmas/${classId}/missoes/${missionId}/copiar`}
            className={linkButtonVariants({ variant: 'outline' })}
          >
            Copiar missão
          </Link>
        </div>
      </header>
      <PublishMission
        published={mission.published}
        publishAction={publishMission.bind(null, classId, missionId)}
      />
      <ObjectiveList
        objectivesPath={objectivesPath}
        published={mission.published}
        objectives={objectives}
        moveAction={moveObjective.bind(null, classId, missionId)}
        removeAction={removeObjective.bind(null, classId, missionId)}
      />
    </>
  )
}

export default MissionPage
