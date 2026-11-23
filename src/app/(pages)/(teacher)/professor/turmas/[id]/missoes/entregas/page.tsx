import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { identifyStudent } from '@/app/(pages)/(teacher)/professor/turmas/[id]/identify-student'
import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import {
  describeLatePenalty,
  describeObjectiveReward
} from '@/app/helpers/objective-values'
import { requireRole } from '@/entry/session'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'

import { approveSubmission, returnSubmission } from './_components/action'
import { SubmissionList } from './_components/submission-list'

export const metadata: Metadata = { title: 'Entregas de missões' }

// Formatted here with a fixed zone: the server runs in UTC and teachers are in Brazil
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
})

const MissionSubmissionsPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/missoes/entregas'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const listed = await objectiveSubmissionModel.listPending(user.id, classId)
  if (!listed) notFound()
  const { schoolClass, submissions } = listed

  return (
    <>
      <ClassEventsRefresh classId={classId} events={['mission']} />
      <Link
        href={`/professor/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed">Entregas de missões</h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {schoolClass.name}
        </p>
      </header>
      <SubmissionList
        submissions={submissions.map((submission) => ({
          id: submission.id,
          missionName: submission.missionName,
          objectiveName: submission.objectiveName,
          text: submission.text,
          link: submission.link,
          date: dateFormat.format(submission.submittedAt),
          late: submission.late,
          reward: describeObjectiveReward(submission),
          penalty: describeLatePenalty(submission) || undefined,
          studentLabel: identifyStudent(
            submission.studentName,
            submission.studentDetail
          )
        }))}
        approveAction={approveSubmission.bind(null, classId)}
        returnAction={returnSubmission.bind(null, classId)}
      />
    </>
  )
}

export default MissionSubmissionsPage
