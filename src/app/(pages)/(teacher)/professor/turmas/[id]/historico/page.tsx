import { cn } from 'cn'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { describeBehaviorValues } from '@/app/(pages)/(teacher)/professor/turmas/[id]/comportamentos/behavior-values'
import { identifyStudent } from '@/app/(pages)/(teacher)/professor/turmas/[id]/identify-student'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { LedgerEntryType } from '@/constants/game'
import { requireRole } from '@/entry/session'
import { ledgerModel } from '@/models/ledger/model'

import { reverseEntry } from './_components/action'
import { EntryList, type HistoryEntry } from './_components/entry-list'

export const metadata: Metadata = { title: 'Histórico' }

const ENTRY_TITLES: Record<LedgerEntryType, string> = {
  behavior: 'Comportamento',
  level_bonus: 'Bônus de nível',
  reward_purchase: 'Compra de recompensa',
  reward_refund: 'Reembolso de recompensa',
  power: 'Poder',
  hp_restore: 'HP restaurado',
  reversal: 'Reversão'
}

// Formatted here with a fixed zone: the server runs in UTC and teachers are in Brazil
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
})

type Deltas = { xpDelta: number; hpDelta: number; coinDelta: number }

const describeDeltas = ({ xpDelta, hpDelta, coinDelta }: Deltas) =>
  describeBehaviorValues({ xp: xpDelta, hp: hpDelta, coins: coinDelta }) ||
  'Sem alteração'

const sumDeltas = (entries: Deltas[]) => {
  const total = { xpDelta: 0, hpDelta: 0, coinDelta: 0 }
  for (const { xpDelta, hpDelta, coinDelta } of entries) {
    total.xpDelta += xpDelta
    total.hpDelta += hpDelta
    total.coinDelta += coinDelta
  }
  return total
}

// Kept focusable and in place at the ends of the list, or the focus would drop to the body when
// the link just followed stops existing
const PageLink = ({
  href,
  disabled,
  children
}: {
  href: string
  disabled: boolean
  children: string
}) => (
  <Link
    href={href}
    aria-disabled={disabled || undefined}
    className={cn(
      linkButtonVariants({ variant: 'outline' }),
      'aria-disabled:pointer-events-none aria-disabled:opacity-50'
    )}
  >
    {children}
  </Link>
)

const HistoryPage = async ({
  params,
  searchParams
}: PageProps<'/professor/turmas/[id]/historico'>) => {
  const [{ id: classId }, { aluno, pagina }] = await Promise.all([
    params,
    searchParams
  ])
  const { user } = await requireRole('teacher')
  const studentId = typeof aluno === 'string' ? aluno : undefined
  const history = await ledgerModel.listHistory(user.id, classId, {
    studentId,
    page: pagina
  })
  if (!history) notFound()
  const { schoolClass, student, page, hasNextPage } = history

  const entries: HistoryEntry[] = history.entries.map((entry) => {
    const [firstReversal] = entry.reversals
    return {
      id: entry.id,
      title: entry.consequenceName
        ? `Consequência: ${entry.consequenceName}`
        : (entry.behaviorName ?? ENTRY_TITLES[entry.type]),
      values: describeDeltas(entry),
      bonus:
        entry.derivedEntries.length > 0
          ? `Bônus de nível: ${describeDeltas(sumDeltas(entry.derivedEntries))}`
          : undefined,
      date: dateFormat.format(entry.createdAt),
      authorName: entry.authorName,
      studentId: entry.studentId,
      studentName: entry.studentName,
      studentLabel: identifyStudent(entry.studentName, entry.studentDetail),
      reversal: firstReversal && {
        date: dateFormat.format(firstReversal.createdAt),
        values: describeDeltas(sumDeltas(entry.reversals))
      },
      reversible: entry.reversible
    }
  })

  const pageHref = (target: number) => {
    const query = new URLSearchParams({
      ...(student && { aluno: student.id }),
      ...(target > 1 && { pagina: String(target) })
    }).toString()
    return `/professor/turmas/${classId}/historico${query && `?${query}`}`
  }

  return (
    <>
      <Link
        href={`/professor/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed wrap-anywhere">
          {student ? `Histórico de ${student.name}` : 'Histórico'}
        </h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {schoolClass.name}
        </p>
        {student && (
          <Link
            href={`/professor/turmas/${classId}/historico`}
            className="w-fit text-xs underline underline-offset-4"
          >
            Ver toda a turma
          </Link>
        )}
      </header>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-sm leading-relaxed">Lançamentos</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {entries.length === 0 ? (
            <Empty className="p-0 md:p-0">
              <EmptyHeader>
                <EmptyTitle className="text-sm leading-relaxed">
                  Nenhum lançamento
                </EmptyTitle>
                <EmptyDescription className="text-xs leading-relaxed">
                  Os comportamentos aplicados aparecem aqui.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <EntryList
              // The router keeps a page's state when only its search params change, so a message
              // about a reversal would stay above a list that may not have that entry
              key={`${student?.id ?? 'all'}-${page}`}
              classId={classId}
              showStudent={!student}
              entries={entries}
              reverseAction={reverseEntry.bind(null, classId)}
            />
          )}
        </CardContent>
      </Card>
      {(page > 1 || hasNextPage) && (
        // The frame is drawn outside the links, so the row needs room for it
        <nav
          aria-label="Páginas"
          className="flex flex-wrap items-center gap-6 p-1.5"
        >
          <PageLink
            href={pageHref(page > 1 ? page - 1 : page)}
            disabled={page <= 1}
          >
            Anterior
          </PageLink>
          <p className="text-xs leading-relaxed">Página {page}</p>
          <PageLink
            href={pageHref(hasNextPage ? page + 1 : page)}
            disabled={!hasNextPage}
          >
            Próxima
          </PageLink>
        </nav>
      )}
    </>
  )
}

export default HistoryPage
