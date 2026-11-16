'use client'

import Link from 'next/link'
import { useState } from 'react'

import { ConfirmActionDialog } from '@/app/(pages)/(teacher)/_components/confirm-action-dialog'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { ActionButton } from '@/app/components/ui/custom/action-button'
import { CoinCounter } from '@/app/components/ui/custom/coin-counter'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { FormState } from '@/entry/form-action'
import type { CharacterClass } from '@/models/avatar/layers'
import { CHARACTER_CLASS_NAMES } from '@/models/character/constants'
import { CHARACTER_CLASSES } from '@/models/character/look'

type Power = {
  id: string
  characterClass: CharacterClass
  name: string
  description: string | null
  cost: number
  minLevel: number
  disabled: boolean
}

type PowerListProps = {
  classId: string
  powers: Power[]
  setEnabledAction: (powerId: string, enabled: boolean) => Promise<FormState>
  removeAction: (powerId: string) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const PowerList = ({
  classId,
  powers,
  setEnabledAction,
  removeAction
}: PowerListProps) => {
  // Out here because the dialog leaves with its row. This message also takes the focus, since the
  // trigger the dialog would return it to is gone
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)
  // The toggle keeps the focus, so its success is only announced: FormMessage would take the focus
  const [toggled, setToggled] = useState<FormState>(IDLE_STATE)

  const handleToggle = (result: FormState) => {
    setToggled(result)
    // A removal's success stays: clearing it would drop the focus it holds
    if (result.status === 'error') setFeedback(result)
    else if (feedback.status === 'error') setFeedback(IDLE_STATE)
  }

  return (
    <>
      <FormMessage state={feedback} />
      <p aria-live="polite" className="sr-only">
        {toggled.status === 'success' && (
          <span key={toggled.id}>{toggled.message}</span>
        )}
      </p>
      {CHARACTER_CLASSES.map((characterClass) => {
        const powersOfClass = powers.filter(
          (power) => power.characterClass === characterClass
        )
        return (
          <Card key={characterClass}>
            <CardHeader>
              <CardTitle>
                <h2 className="text-sm leading-relaxed">
                  {CHARACTER_CLASS_NAMES[characterClass]}
                </h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {powersOfClass.length === 0 ? (
                <Empty className="p-0 md:p-0">
                  <EmptyHeader>
                    <EmptyTitle className="text-sm leading-relaxed">
                      Nenhum poder
                    </EmptyTitle>
                    <EmptyDescription className="text-xs leading-relaxed">
                      Os alunos desta classe não têm poderes para usar.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                // Tailwind's `list-style: none` makes Safari drop the list semantics
                <ul role="list" className="flex flex-col gap-6">
                  {powersOfClass.map((power) => (
                    <li
                      key={power.id}
                      className="flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2">
                        <p className="text-xs leading-relaxed wrap-anywhere">
                          {power.name}
                        </p>
                        {power.description && (
                          <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
                            {power.description}
                          </p>
                        )}
                        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-relaxed text-muted-foreground">
                          <CoinCounter value={power.cost} />
                          <span>A partir do nível {power.minLevel}</span>
                          {power.disabled && (
                            <span className="text-foreground">Desativado</span>
                          )}
                        </p>
                      </div>
                      {/* The frame is drawn outside the buttons, so the row needs room for it */}
                      <div className="flex flex-wrap gap-6 p-1.5">
                        <Link
                          href={`/professor/turmas/${classId}/poderes/${power.id}/editar`}
                          className={linkButtonVariants({ variant: 'outline' })}
                        >
                          Editar
                          <span className="sr-only"> {power.name}</span>
                        </Link>
                        <ActionButton
                          variant="outline"
                          action={() =>
                            setEnabledAction(power.id, power.disabled)
                          }
                          onResult={handleToggle}
                        >
                          {power.disabled ? 'Reativar' : 'Desativar'}
                          <span className="sr-only"> {power.name}</span>
                        </ActionButton>
                        <ConfirmActionDialog
                          triggerLabel={
                            <>
                              Remover
                              <span className="sr-only"> {power.name}</span>
                            </>
                          }
                          title="Remover poder?"
                          description={`${power.name} sairá da lista da turma. Para só esconder dos alunos, desative o poder.`}
                          confirmLabel="Remover"
                          action={async () => {
                            const result = await removeAction(power.id)
                            // The power stays listed, so the message of an earlier removal would mislead
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
