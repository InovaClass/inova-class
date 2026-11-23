import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { identifyStudent } from '@/app/(pages)/(teacher)/professor/turmas/[id]/identify-student'
import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import { describeObjectiveReward } from '@/app/helpers/objective-values'
import { requireRole } from '@/entry/session'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'

import { completeObjective } from './_components/action'
import { CompleteObjectiveForm } from './_components/complete-objective-form'

export const metadata: Metadata = { title: 'Concluir objetivo' }

const CompleteObjectivePage = async ({
  params
}: PageProps<'/professor/turmas/[id]/missoes/[mission-id]/objetivos/[objective-id]/concluir'>) => {
  const {
    id: classId,
    'mission-id': missionId,
    'objective-id': objectiveId
  } = await params
  const { user } = await requireRole('teacher')
  const found = await objectiveSubmissionModel.listCompletable(
    user.id,
    classId,
    missionId,
    objectiveId
  )
  if (!found) notFound()
  const { mission, objective, students } = found

  return (
    <>
      <ClassEventsRefresh classId={classId} events={['mission']} />
      <Link
        href={`/professor/turmas/${classId}/missoes/${missionId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à missão
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed wrap-anywhere">
          Concluir {objective.name}
        </h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {mission.name}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Para uma atividade feita em sala, sem nada a enviar. Cada aluno recebe{' '}
          {describeObjectiveReward(objective)}, sem penalidade por atraso.
        </p>
      </header>
      <CompleteObjectiveForm
        students={students.map((student) => ({
          id: student.id,
          label: identifyStudent(student.name, student.detail)
        }))}
        action={completeObjective.bind(null, classId, missionId, objectiveId)}
      />
    </>
  )
}

export default CompleteObjectivePage
