import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { MissionSummaryList } from '@/app/(pages)/(student)/_components/mission-summary-list'
import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import { requireRole } from '@/entry/session'
import { enrollmentModel } from '@/models/enrollment/model'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'

export const metadata: Metadata = { title: 'Missões' }

const StudentMissionsPage = async ({
  params
}: PageProps<'/aluno/turmas/[id]/missoes'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('student')
  const [enrollment, missions] = await Promise.all([
    enrollmentModel.findOfStudent(user.id, classId),
    objectiveSubmissionModel.listMissionsForStudent(user.id, classId)
  ])
  if (!enrollment || !missions) notFound()

  return (
    <>
      <ClassEventsRefresh classId={classId} events={['mission']} />
      <Link
        href={`/aluno/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed">Missões</h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {enrollment.className}
        </p>
      </header>
      <MissionSummaryList
        classId={classId}
        title="Missões da turma"
        missions={missions}
        showDescription
        empty={{
          title: 'Nenhuma missão',
          description: 'As missões que o professor publicar aparecem aqui.'
        }}
      />
    </>
  )
}

export default StudentMissionsPage
