import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import { PageNav } from '@/app/components/blocks/page-nav'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import {
  describeDeltas,
  describeDerivedEntries,
  entryTitle,
  sumDeltas
} from '@/app/helpers/ledger-entry'
import { requireRole } from '@/entry/session'
import { ledgerModel } from '@/models/ledger/model'

export const metadata: Metadata = { title: 'Histórico' }

// Formatted here with a fixed zone: the server runs in UTC and students are in Brazil
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
})

const StudentHistoryPage = async ({
  params,
  searchParams
}: PageProps<'/aluno/turmas/[id]/historico'>) => {
  const [{ id: classId }, { pagina }] = await Promise.all([
    params,
    searchParams
  ])
  const { user } = await requireRole('student')
  const history = await ledgerModel.listStudentHistory(user.id, classId, {
    page: pagina
  })
  if (!history) notFound()
  const { className, page, hasNextPage, entries } = history

  return (
    <>
      <ClassEventsRefresh classId={classId} events={['ledger']} />
      <Link
        href={`/aluno/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed">Seu histórico</h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {className}
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-sm leading-relaxed">Lançamentos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <Empty className="p-0 md:p-0">
              <EmptyHeader>
                <EmptyTitle className="text-sm leading-relaxed">
                  Nenhum lançamento
                </EmptyTitle>
                <EmptyDescription className="text-xs leading-relaxed">
                  O XP, o HP e as moedas que você ganhar ou perder aparecem
                  aqui.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            // Tailwind's `list-style: none` makes Safari drop the list semantics
            <ul role="list" className="flex flex-col gap-8">
              {entries.map((entry) => {
                const [firstReversal] = entry.reversals
                return (
                  <li
                    key={entry.id}
                    className="flex min-w-0 flex-col gap-2 text-xs leading-relaxed"
                  >
                    <p className="wrap-anywhere">{entryTitle(entry)}</p>
                    <p>{describeDeltas(entry)}</p>
                    {describeDerivedEntries(entry.derivedEntries).map(
                      (line) => (
                        <p key={line}>{line}</p>
                      )
                    )}
                    <p className="text-muted-foreground">
                      {dateFormat.format(entry.createdAt)}
                    </p>
                    {firstReversal && (
                      <p className="text-muted-foreground">
                        Revertido em{' '}
                        {dateFormat.format(firstReversal.createdAt)}:{' '}
                        {describeDeltas(sumDeltas(entry.reversals))}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <PageNav
        page={page}
        hasNextPage={hasNextPage}
        hrefOf={(target) =>
          `/aluno/turmas/${classId}/historico${target > 1 ? `?pagina=${target}` : ''}`
        }
      />
    </>
  )
}

export default StudentHistoryPage
