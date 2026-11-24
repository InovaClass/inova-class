import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { StudentStats } from '@/app/(pages)/(student)/_components/student-stats'
import { describeMissionProgress } from '@/app/(pages)/(student)/mission-links'
import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import { requireRole } from '@/entry/session'
import { enrollmentModel } from '@/models/enrollment/model'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'

import { submitObjective } from './_components/action'
import { ObjectiveList } from './_components/objective-list'

export const metadata: Metadata = { title: 'Missão' }

const StudentMissionPage = async ({
  params
}: PageProps<'/aluno/turmas/[id]/missoes/[mission-id]'>) => {
  const { id: classId, 'mission-id': missionId } = await params
  const { user } = await requireRole('student')
  const [enrollment, mission] = await Promise.all([
    enrollmentModel.findOfStudent(user.id, classId),
    objectiveSubmissionModel.findMissionForStudent(user.id, classId, missionId)
  ])
  if (!enrollment || !mission) notFound()

  return (
    <>
      <ClassEventsRefresh classId={classId} events={['mission', 'ledger']} />
      <Link
        href={`/aluno/turmas/${classId}/missoes`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar às missões
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed wrap-anywhere">
          {mission.name}
        </h1>
        {mission.description && (
          <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
            {mission.description}
          </p>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {mission.currentObjective
            ? describeMissionProgress(mission)
            : 'Missão concluída'}
        </p>
      </header>
      {/* Here too, so an approval while the student reads the mission animates the reward */}
      <StudentStats
        look={enrollment.look}
        progress={enrollment.progress}
        hp={enrollment.hp}
        coins={enrollment.coins}
      />
      <ObjectiveList
        objectives={mission.objectives}
        submitAction={submitObjective.bind(null, classId)}
      />
    </>
  )
}

export default StudentMissionPage
