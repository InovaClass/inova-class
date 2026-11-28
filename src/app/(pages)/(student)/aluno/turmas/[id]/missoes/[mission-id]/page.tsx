import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { MissionMap } from '@/app/(pages)/(student)/_components/mission-map'
import { StudentStats } from '@/app/(pages)/(student)/_components/student-stats'
import { describeMissionProgress } from '@/app/(pages)/(student)/mission-links'
import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import { ObjectiveThread } from '@/app/components/blocks/class/objective-thread'
import { requireRole } from '@/entry/session'
import { enrollmentModel } from '@/models/enrollment/model'
import { messageModel } from '@/models/message/model'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'

import {
  postThreadMessage,
  removeThreadMessage,
  submitObjective
} from './_components/action'
import { ObjectiveList } from './_components/objective-list'

export const metadata: Metadata = { title: 'Missão' }

// Formatted here with a fixed zone: the server runs in UTC and students are in Brazil
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
})

const StudentMissionPage = async ({
  params,
  searchParams
}: PageProps<'/aluno/turmas/[id]/missoes/[mission-id]'>) => {
  const [{ id: classId, 'mission-id': missionId }, { discussao, paginas }] =
    await Promise.all([params, searchParams])
  const { user } = await requireRole('student')
  const [enrollment, mission, discussions] = await Promise.all([
    enrollmentModel.findOfStudent(user.id, classId),
    objectiveSubmissionModel.findMissionForStudent(user.id, classId, missionId),
    messageModel.listThreadsForStudent(user.id, classId, missionId, {
      objectiveId: discussao,
      pages: paginas
    })
  ])
  if (!enrollment || !mission || !discussions) notFound()
  const missionPath = `/aluno/turmas/${classId}/missoes/${missionId}`
  const objectiveNames = new Map(
    mission.objectives.map(({ id, name }) => [id, name])
  )

  return (
    <>
      <ClassEventsRefresh
        classId={classId}
        events={['mission', 'ledger', 'message']}
      />
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
      <MissionMap
        map={mission.map}
        states={mission.objectives.map(({ state }) => state)}
        currentIndex={mission.objectives.findIndex(
          ({ id }) => id === mission.currentObjective?.id
        )}
        look={enrollment.look}
      />
      <ObjectiveList
        objectives={mission.objectives}
        threads={Object.fromEntries(
          discussions.threads.map((thread) => [
            thread.objectiveId,
            <ObjectiveThread
              key={thread.objectiveId}
              objectiveId={thread.objectiveId}
              objectiveName={objectiveNames.get(thread.objectiveId) ?? ''}
              messages={thread.messages.map((message) => ({
                id: message.id,
                body: message.body,
                date: dateFormat.format(message.createdAt),
                author: message.author,
                isOwn: message.isOwn,
                canRemove: message.canRemove
              }))}
              composer={
                thread.discussionEnabled && !discussions.muted
                  ? {
                      hint: 'O professor e os colegas que chegaram a este objetivo leem a discussão.',
                      action: postThreadMessage.bind(
                        null,
                        classId,
                        thread.objectiveId
                      )
                    }
                  : undefined
              }
              notice={
                thread.discussionEnabled
                  ? 'O professor silenciou você nas mensagens da turma. Você ainda pode ler a discussão.'
                  : 'O professor fechou a discussão. Você ainda pode ler as mensagens.'
              }
              loadEarlier={
                thread.hasMore || thread.pages > 1
                  ? {
                      href: `${missionPath}?discussao=${thread.objectiveId}&paginas=${thread.pages + 1}`,
                      hasMore: thread.hasMore
                    }
                  : undefined
              }
              removeAction={removeThreadMessage.bind(null, classId)}
            />
          ])
        )}
        submitAction={submitObjective.bind(null, classId)}
      />
    </>
  )
}

export default StudentMissionPage
