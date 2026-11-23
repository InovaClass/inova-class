'use client'

import Link from 'next/link'
import { useState } from 'react'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { ConfirmActionDialog } from '@/app/components/ui/custom/confirm-action-dialog'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { FormState } from '@/entry/form-action'

type Mission = {
  id: string
  name: string
  description: string | null
  published: boolean
  objectiveCount: number
}

type MissionListProps = {
  classId: string
  missions: Mission[]
  removeAction: (missionId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

const GROUPS = [
  {
    title: 'Rascunhos',
    published: false,
    empty: {
      title: 'Nenhum rascunho',
      description: 'Crie uma missão e monte os objetivos antes de publicar.'
    }
  },
  {
    title: 'Publicadas',
    published: true,
    empty: {
      title: 'Nenhuma missão publicada',
      description: 'Os alunos só veem uma missão depois de publicada.'
    }
  }
]

const describeObjectiveCount = (count: number) => {
  if (count === 0) return 'Nenhum objetivo'
  return count === 1 ? '1 objetivo' : `${count} objetivos`
}

export const MissionList = ({
  classId,
  missions,
  removeAction
}: MissionListProps) => {
  // Out here because the dialog leaves with its row. This message also takes the focus, since the
  // trigger the dialog would return it to is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)

  return (
    <>
      <FormMessage state={feedback} />
      {GROUPS.map(({ title, published, empty }) => {
        const missionsOfGroup = missions.filter(
          (mission) => mission.published === published
        )
        return (
          <Card key={title}>
            <CardHeader>
              <CardTitle>
                <h2 className="text-sm leading-relaxed">{title}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {missionsOfGroup.length === 0 ? (
                <Empty className="p-0 md:p-0">
                  <EmptyHeader>
                    <EmptyTitle className="text-sm leading-relaxed">
                      {empty.title}
                    </EmptyTitle>
                    <EmptyDescription className="text-xs leading-relaxed">
                      {empty.description}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                // Tailwind's `list-style: none` makes Safari drop the list semantics
                <ul role="list" className="flex flex-col gap-6">
                  {missionsOfGroup.map((mission) => (
                    <li
                      key={mission.id}
                      className="flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2">
                        <p className="text-xs leading-relaxed wrap-anywhere">
                          {mission.name}
                        </p>
                        {mission.description && (
                          <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
                            {mission.description}
                          </p>
                        )}
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {describeObjectiveCount(mission.objectiveCount)}
                        </p>
                      </div>
                      {/* The frame is drawn outside the buttons, so the row needs room for it */}
                      <div className="flex flex-wrap gap-6 p-1.5">
                        <Link
                          href={`/professor/turmas/${classId}/missoes/${mission.id}`}
                          className={linkButtonVariants({ variant: 'outline' })}
                        >
                          Objetivos
                          <span className="sr-only"> de {mission.name}</span>
                        </Link>
                        <Link
                          href={`/professor/turmas/${classId}/missoes/${mission.id}/editar`}
                          className={linkButtonVariants({ variant: 'outline' })}
                        >
                          Editar
                          <span className="sr-only"> {mission.name}</span>
                        </Link>
                        <ConfirmActionDialog
                          triggerLabel={
                            <>
                              Remover
                              <span className="sr-only"> {mission.name}</span>
                            </>
                          }
                          title="Remover missão?"
                          description={
                            mission.published
                              ? `${mission.name} sairá da lista da turma, com os objetivos, e os alunos deixarão de vê-la.`
                              : `${mission.name} sairá da lista da turma, com os objetivos.`
                          }
                          confirmLabel="Remover"
                          action={async () => {
                            const result = await removeAction(mission.id)
                            // The mission stays listed, so the message of an earlier removal would mislead
                            if (result.status === 'error') {
                              setFeedback(IDLE_STATE)
                            }
                            return result
                          }}
                          onSuccess={setFeedback}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )
      })}
    </>
  )
}
