'use client'

import Link from 'next/link'
import { useState } from 'react'

import { ConfirmActionDialog } from '@/app/(pages)/(teacher)/_components/confirm-action-dialog'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import type { FormState } from '@/entry/form-action'

export type HistoryEntry = {
  id: string
  title: string
  values: string
  bonus?: string
  date: string
  authorName: string | null
  studentId: string
  studentName: string
  studentLabel: string
  reversal?: { date: string; values: string }
  reversible: boolean
}

type EntryListProps = {
  classId: string
  showStudent: boolean
  entries: HistoryEntry[]
  reverseAction: (entryId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const EntryList = ({
  classId,
  showStudent,
  entries,
  reverseAction
}: EntryListProps) => {
  // Out here because the dialog leaves with the row's button. This message also takes the focus,
  // since the trigger the dialog would return it to is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)

  return (
    <div className="flex flex-col gap-6">
      <FormMessage state={feedback} />
      {/* Tailwind's `list-style: none` makes Safari drop the list semantics */}
      <ul role="list" className="flex flex-col gap-8">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2 text-xs leading-relaxed">
              <p className="wrap-anywhere">{entry.title}</p>
              {showStudent && (
                <Link
                  href={`/professor/turmas/${classId}/historico?aluno=${entry.studentId}`}
                  className="w-fit wrap-anywhere underline underline-offset-4"
                >
                  {entry.studentName}
                </Link>
              )}
              <p>{entry.values}</p>
              {entry.bonus && <p>{entry.bonus}</p>}
              <p className="wrap-anywhere text-muted-foreground">
                {entry.date}
                {entry.authorName && `, por ${entry.authorName}`}
              </p>
              {entry.reversal && (
                <p className="text-muted-foreground">
                  Revertido em {entry.reversal.date}: {entry.reversal.values}
                </p>
              )}
            </div>
            {entry.reversible && (
              // The frame is drawn outside the button, so it needs room for it
              <div className="p-1.5">
                <ConfirmActionDialog
                  triggerLabel={
                    <>
                      Reverter
                      <span className="sr-only">
                        {' '}
                        {entry.title} de {entry.studentLabel}, {entry.date}
                      </span>
                    </>
                  }
                  title="Reverter lançamento?"
                  description={`O lançamento "${entry.title}" será desfeito para ${entry.studentLabel}, junto com os bônus de nível que ele gerou. Moedas já gastas não são retiradas.`}
                  confirmLabel="Reverter"
                  action={async () => {
                    const result = await reverseAction(entry.id)
                    // The message of an earlier reversal would mislead next to this error
                    if (result.status === 'error') setFeedback(IDLE_STATE)
                    return result
                  }}
                  onSuccess={setFeedback}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
