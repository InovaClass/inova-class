import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import { LoadEarlierLink } from '@/app/components/blocks/class/load-earlier-link'
import { MessageBoard } from '@/app/components/blocks/class/message-board'
import { MessageComposer } from '@/app/components/blocks/class/message-composer'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import { messageModel } from '@/models/message/model'

import {
  postMessage,
  removeMessage,
  setChatEnabled,
  setStudentMuted
} from './_components/action'
import { ChatVisibility } from './_components/chat-visibility'

export const metadata: Metadata = { title: 'Mural' }

// Formatted here with a fixed zone: the server runs in UTC and teachers are in Brazil
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
})

const BoardPage = async ({
  params,
  searchParams
}: PageProps<'/professor/turmas/[id]/mural'>) => {
  const [{ id: classId }, { paginas }] = await Promise.all([
    params,
    searchParams
  ])
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()
  const board = await messageModel.listForTeacher(user.id, classId, paginas)

  return (
    <>
      <ClassEventsRefresh classId={classId} events={['message']} />
      <Link
        href={`/professor/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed">Mural</h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {schoolClass.name}
        </p>
      </header>
      <ChatVisibility
        enabled={schoolClass.chatEnabled}
        toggleAction={setChatEnabled.bind(
          null,
          classId,
          !schoolClass.chatEnabled
        )}
      />
      <MessageComposer
        hint={
          schoolClass.chatEnabled
            ? 'Todos os alunos da turma leem o mural.'
            : 'Os alunos leem o mural quando você o abrir.'
        }
        action={postMessage.bind(null, classId)}
      />
      <MessageBoard
        messages={board.messages.map((message) => ({
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
        removeAction={removeMessage.bind(null, classId)}
        muteAction={setStudentMuted.bind(null, classId)}
      />
      {(board.hasMore || board.pages > 1) && (
        <LoadEarlierLink
          href={`/professor/turmas/${classId}/mural?paginas=${board.pages + 1}`}
          hasMore={board.hasMore}
        />
      )}
    </>
  )
}

export default BoardPage
