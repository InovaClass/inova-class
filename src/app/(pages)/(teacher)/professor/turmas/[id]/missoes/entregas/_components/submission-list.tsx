'use client'

import { useState } from 'react'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { ActionButton } from '@/app/components/ui/custom/action-button'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import type { FormState } from '@/entry/form-action'
import type { ReturnSubmissionInput } from '@/models/objective-submission/schema'

import { ReturnSubmissionDialog } from './return-submission-dialog'

type Submission = {
  id: string
  missionName: string
  objectiveName: string
  text: string | null
  link: string | null
  date: string
  late: boolean
  reward: string
  penalty: string | undefined
  studentLabel: string
}

type SubmissionListProps = {
  submissions: Submission[]
  approveAction: (submissionId: string) => Promise<FormState>
  returnAction: (
    submissionId: string,
    input: ReturnSubmissionInput
  ) => Promise<FormState<ReturnSubmissionInput>>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const SubmissionList = ({
  submissions,
  approveAction,
  returnAction
}: SubmissionListProps) => {
  // Out here because the row leaves with the decision. This message also takes the focus, since the
  // button it was on is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)

  return (
    <div className="flex flex-col gap-6">
      <FormMessage state={feedback} />
      {submissions.length === 0 ? (
        <Empty className="p-0 md:p-0">
          <EmptyHeader>
            <EmptyTitle className="text-sm leading-relaxed">
              Nenhuma entrega pendente
            </EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              Quando um aluno enviar um objetivo, a entrega aparece aqui.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // Tailwind's `list-style: none` makes Safari drop the list semantics
        <ul role="list" className="flex flex-col gap-8">
          {submissions.map((submission) => {
            const label = `${submission.objectiveName} de ${submission.studentLabel}`
            return (
              <li
                key={submission.id}
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2 text-xs leading-relaxed">
                  <p className="wrap-anywhere">{submission.objectiveName}</p>
                  <p className="wrap-anywhere text-muted-foreground">
                    {submission.missionName}
                  </p>
                  <p className="wrap-anywhere">{submission.studentLabel}</p>
                  {submission.text && (
                    <p className="wrap-anywhere whitespace-pre-line">
                      {submission.text}
                    </p>
                  )}
                  {submission.link && (
                    // An address the student typed: `nofollow` and `noreferrer` keep the class page
                    // out of it
                    <a
                      href={submission.link}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="w-fit wrap-anywhere underline underline-offset-4"
                    >
                      {submission.link}
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  )}
                  <p className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
                    <span>{submission.date}</span>
                    <span>Recompensa: {submission.reward}</span>
                    {submission.late && (
                      <span className="text-foreground">
                        {submission.penalty
                          ? `Atrasada: ${submission.penalty}`
                          : 'Atrasada'}
                      </span>
                    )}
                  </p>
                </div>
                {/* The frame is drawn outside the buttons, so the row needs room for it */}
                <div className="flex flex-wrap gap-6 p-1.5">
                  {/* Not confirmed, since the reward is reversed from the history */}
                  <ActionButton
                    pendingLabel="Aprovando"
                    variant="outline"
                    action={() => approveAction(submission.id)}
                    onResult={setFeedback}
                  >
                    Aprovar
                    <span className="sr-only"> {label}</span>
                  </ActionButton>
                  <ReturnSubmissionDialog
                    objectiveName={submission.objectiveName}
                    studentLabel={submission.studentLabel}
                    action={(input) => returnAction(submission.id, input)}
                    onSuccess={setFeedback}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
