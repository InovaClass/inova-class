import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import { LoadEarlierLink } from '@/app/components/blocks/class/load-earlier-link'
import { MessageBoard } from '@/app/components/blocks/class/message-board'
import { MessageComposer } from '@/app/components/blocks/class/message-composer'
import { requireRole } from '@/entry/session'
import { messageModel } from '@/models/message/model'

import { postMessage, removeMessage } from './_components/action'

export const metadata: Metadata = { title: 'Mural' }

// Formatted here with a fixed zone: the server runs in UTC and students are in Brazil
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
})

const StudentBoardPage = async ({
  params,
  searchParams
}: PageProps<'/aluno/turmas/[id]/mural'>) => {
  const [{ id: classId }, { paginas }] = await Promise.all([
    params,
    searchParams
  ])
  const { user } = await requireRole('student')
  const board = await messageModel.listForStudent(user.id, classId, paginas)
  if (!board) notFound()

  return (
    <>
      <ClassEventsRefresh classId={classId} events={['message']} />
      <Link
        href={`/aluno/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed">Mural</h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {board.className}
        </p>
      </header>
      {board.muted ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          O professor silenciou você nas mensagens da turma. Você ainda pode ler
          o mural.
        </p>
      ) : (
        <MessageComposer
          hint="O professor e os colegas da turma leem o mural."
          action={postMessage.bind(null, classId)}
        />
      )}
      <MessageBoard
        messages={board.messages.map((message) => ({
          id: message.id,
          body: message.body,
          date: dateFormat.format(message.createdAt),
          author: message.author,
          isOwn: message.isOwn,
          canRemove: message.canRemove
        }))}
        removeAction={removeMessage.bind(null, classId)}
      />
      {(board.hasMore || board.pages > 1) && (
        <LoadEarlierLink
          href={`/aluno/turmas/${classId}/mural?paginas=${board.pages + 1}`}
          hasMore={board.hasMore}
        />
      )}
    </>
  )
}

export default StudentBoardPage
