import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import { Leaderboard } from '@/app/components/blocks/class/leaderboard'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'

import { setRankingVisible } from './_components/action'
import { RankingVisibility } from './_components/ranking-visibility'

export const metadata: Metadata = { title: 'Ranking' }

const RankingPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/ranking'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()
  const ranking = await enrollmentModel.listRanking(user.id, classId)

  return (
    <>
      <ClassEventsRefresh classId={classId} events={['ledger']} />
      <Link
        href={`/professor/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed">Ranking</h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {schoolClass.name}
        </p>
      </header>
      <RankingVisibility
        visible={schoolClass.rankingVisible}
        toggleAction={setRankingVisible.bind(
          null,
          classId,
          !schoolClass.rankingVisible
        )}
      />
      <Leaderboard
        title="Alunos por XP"
        players={ranking.map((student) => ({
          key: student.id,
          position: student.position,
          name: student.name,
          detail: student.detail,
          level: student.level,
          xp: student.xp,
          look: student.look
        }))}
      />
    </>
  )
}

export default RankingPage
