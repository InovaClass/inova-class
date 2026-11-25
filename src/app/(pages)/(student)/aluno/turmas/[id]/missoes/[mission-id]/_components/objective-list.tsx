'use client'

import { cn } from 'cn'
import { useState } from 'react'

import { objectiveAnchorOf } from '@/app/(pages)/(student)/mission-links'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import {
  describeLatePenalty,
  describeObjectiveReward,
  formatDueOn
} from '@/app/helpers/objective-values'
import type { FormState } from '@/entry/form-action'
import type { ObjectiveState } from '@/models/objective-submission/rules'
import type { SubmissionInput } from '@/models/objective-submission/schema'

import { SubmissionForm } from './submission-form'

type Objective =
  | { id: string; name: string; state: 'locked' }
  | {
      id: string
      name: string
      state: Exclude<ObjectiveState, 'locked'>
      story: string
      dueOn: string | null
      xpReward: number
      coinReward: number
      latePenaltyCoins: number
      latePenaltyHp: number
      submission?: {
        text: string | null
        link: string | null
        teacherComment: string | null
      }
    }

type ObjectiveListProps = {
  objectives: Objective[]
  submitAction: (
    objectiveId: string,
    input: SubmissionInput
  ) => Promise<FormState<SubmissionInput>>
}

const IDLE_STATE: FormState = { status: 'idle' }

const STATE_LABELS: Record<ObjectiveState, string> = {
  locked: 'Bloqueado',
  available: 'Disponível',
  pending: 'Em avaliação',
  returned: 'Devolvido',
  approved: 'Concluído'
}

export const ObjectiveList = ({
  objectives,
  submitAction
}: ObjectiveListProps) => {
  // Out here because the form leaves once the objective is sent. This message also takes the focus,
  // since the field it was on is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)
  const pendingIds = objectives
    .filter((objective) => objective.state === 'pending')
    .map((objective) => objective.id)
  const [previousPendingIds, setPreviousPendingIds] = useState(pendingIds)
  if (pendingIds.join(',') !== previousPendingIds.join(',')) {
    setPreviousPendingIds(pendingIds)
    // Only the teacher takes an objective out of `pending`, which makes "Aguarde a avaliação" stale
    if (previousPendingIds.some((id) => !pendingIds.includes(id))) {
      setFeedback(IDLE_STATE)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm leading-relaxed">Objetivos</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <FormMessage state={feedback} />
        {/* Tailwind's `list-style: none` makes Safari drop the list semantics */}
        <ol role="list" className="flex flex-col gap-8">
          {objectives.map((objective, index) => (
            <li
              key={objective.id}
              id={objectiveAnchorOf(objective.id)}
              // Next.js focuses the target of the link's hash, which an item only takes with a tabIndex
              tabIndex={-1}
              className="flex min-w-0 scroll-mt-6 flex-col gap-4 outline-none"
            >
              <div className="flex flex-col gap-2">
                <h3
                  id={`${objectiveAnchorOf(objective.id)}-title`}
                  className={cn(
                    'text-xs leading-relaxed wrap-anywhere',
                    objective.state === 'locked' && 'text-muted-foreground'
                  )}
                >
                  {index + 1}. {objective.name}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {STATE_LABELS[objective.state]}
                </p>
              </div>
              {objective.state !== 'locked' && (
                <ObjectiveDetails
                  objective={objective}
                  submitAction={submitAction}
                  onSubmitted={(result) =>
                    // The form shows its own error, so an older success would contradict it
                    setFeedback(
                      result.status === 'success' ? result : IDLE_STATE
                    )
                  }
                />
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

type ObjectiveDetailsProps = {
  objective: Exclude<Objective, { state: 'locked' }>
  submitAction: ObjectiveListProps['submitAction']
  onSubmitted: (result: FormState) => void
}

const ObjectiveDetails = ({
  objective,
  submitAction,
  onSubmitted
}: ObjectiveDetailsProps) => {
  const penalty = describeLatePenalty(objective)
  const { submission } = objective

  return (
    <>
      <p className="text-xs leading-relaxed wrap-anywhere whitespace-pre-line">
        {objective.story}
      </p>
      <p className="flex flex-wrap gap-x-4 gap-y-2 text-xs leading-relaxed text-muted-foreground">
        <span>
          {objective.dueOn
            ? `Prazo: ${formatDueOn(objective.dueOn)}`
            : 'Sem prazo'}
        </span>
        <span>Recompensa: {describeObjectiveReward(objective)}</span>
        {penalty && <span>Atraso: {penalty}</span>}
      </p>
      {objective.state === 'returned' && (
        <p className="text-xs leading-relaxed wrap-anywhere whitespace-pre-line">
          {submission?.teacherComment
            ? `Comentário do professor: ${submission.teacherComment}`
            : 'O professor devolveu este objetivo. Envie de novo.'}
        </p>
      )}
      {objective.state === 'pending' && submission?.text && (
        <SentSubmission text={submission.text} link={submission.link} />
      )}
      {(objective.state === 'available' || objective.state === 'returned') && (
        <SubmissionForm
          objectiveName={objective.name}
          titleId={`${objectiveAnchorOf(objective.id)}-title`}
          // A returned objective starts from what was sent, so the student only fixes what's missing
          defaultValues={{
            text: submission?.text ?? '',
            link: submission?.link ?? ''
          }}
          action={(input) => submitAction(objective.id, input)}
          onResult={onSubmitted}
        />
      )}
    </>
  )
}

const SentSubmission = ({
  text,
  link
}: {
  text: string
  link: string | null
}) => (
  <div className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
    <p>Sua entrega:</p>
    <p className="wrap-anywhere whitespace-pre-line">{text}</p>
    {link && (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="w-fit wrap-anywhere underline underline-offset-4"
      >
        {link}
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    )}
  </div>
)
