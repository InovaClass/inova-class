import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import { ObjectiveThread } from '@/app/components/blocks/class/objective-thread'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { requireRole } from '@/entry/session'
import { messageModel } from '@/models/message/model'
import { missionModel } from '@/models/mission/model'

import {
  moveObjective,
  postThreadMessage,
  publishMission,
  removeObjective,
  removeThreadMessage,
  setStudentMuted
} from './_components/action'
import { ObjectiveList } from './_components/objective-list'
import { PublishMission } from './_components/publish-mission'

export const metadata: Metadata = { title: 'Missão' }

// Formatted here with a fixed zone: the server runs in UTC and teachers are in Brazil
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
})

const MissionPage = async ({
  params,
  searchParams
}: PageProps<'/professor/turmas/[id]/missoes/[mission-id]'>) => {
  const [{ id: classId, 'mission-id': missionId }, { discussao, paginas }] =
    await Promise.all([params, searchParams])
  const { user } = await requireRole('teacher')
  const mission = await missionModel.findOwned(user.id, classId, missionId)
  if (!mission) notFound()
  const [objectives, threads] = await Promise.all([
    missionModel.listObjectives(user.id, classId, missionId),
    messageModel.listThreadsForTeacher(user.id, classId, missionId, {
      objectiveId: discussao,
      pages: paginas
    })
  ])
  const missionPath = `/professor/turmas/${classId}/missoes/${missionId}`
  const objectivesPath = `${missionPath}/objetivos`
  const objectiveNames = new Map(objectives.map(({ id, name }) => [id, name]))

  return (
    <>
      <ClassEventsRefresh classId={classId} events={['message']} />
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
            href={`${missionPath}/copiar`}
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
        threads={Object.fromEntries(
          threads.map((thread) => [
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
                canRemove: message.canRemove,
                removedNotice:
                  message.removed &&
                  `Removida${message.removed.byName ? ` por ${message.removed.byName}` : ''} em ${dateFormat.format(message.removed.at)}. Os alunos não a veem mais.`,
                mutableStudent: message.mutableStudent
              }))}
              composer={
                thread.discussionEnabled
                  ? {
                      hint: mission.published
                        ? 'Os alunos que chegaram a este objetivo leem a discussão.'
                        : 'Os alunos leem a discussão depois que a missão for publicada.',
                      action: postThreadMessage.bind(
                        null,
                        classId,
                        thread.objectiveId
                      )
                    }
                  : undefined
              }
              notice="A discussão está fechada. Os alunos ainda leem as mensagens. Para reabrir, edite o objetivo."
              loadEarlier={
                thread.hasMore || thread.pages > 1
                  ? {
                      href: `${missionPath}?discussao=${thread.objectiveId}&paginas=${thread.pages + 1}`,
                      hasMore: thread.hasMore
                    }
                  : undefined
              }
              removeAction={removeThreadMessage.bind(null, classId)}
              muteAction={setStudentMuted.bind(null, classId)}
            />
          ])
        )}
        moveAction={moveObjective.bind(null, classId, missionId)}
        removeAction={removeObjective.bind(null, classId, missionId)}
      />
    </>
  )
}

export default MissionPage
