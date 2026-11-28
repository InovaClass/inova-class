'use client'

import { useState } from 'react'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { ActionButton } from '@/app/components/ui/custom/action-button'
import { ConfirmActionDialog } from '@/app/components/ui/custom/confirm-action-dialog'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import type { FormState } from '@/entry/form-action'
import type { AvatarLook } from '@/models/avatar/layers'

import { ClassMessage } from './class-message'

export type BoardMessage = {
  id: string
  body: string
  date: string
  author: { name: string; isTeacher: boolean; look: AvatarLook | null }
  isOwn: boolean
  canRemove: boolean
  removedNotice?: string
  // Only on the teacher's board, for a student still in the class
  mutableStudent?: { id: string; muted: boolean }
}

type MessageBoardProps = {
  messages: BoardMessage[]
  removeAction: (messageId: string) => Promise<FormState>
  muteAction?: (studentId: string, muted: boolean) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const MessageBoard = ({
  messages,
  removeAction,
  muteAction
}: MessageBoardProps) => {
  // Out here because a removed message leaves with its button, so this message takes the focus
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)
  // The mute button keeps the focus, so its success is only announced: FormMessage would take it
  const [muteResult, setMuteResult] = useState<FormState>(IDLE_STATE)

  const showMuteResult = (result: FormState) => {
    setMuteResult(result)
    setFeedback(result.status === 'error' ? result : IDLE_STATE)
  }

  return (
    <div className="flex flex-col gap-6">
      <FormMessage state={feedback} />
      <p aria-live="polite" className="sr-only">
        {muteResult.status === 'success' && (
          <span key={muteResult.id}>{muteResult.message}</span>
        )}
      </p>
      {messages.length === 0 ? (
        <Empty className="p-0 md:p-0">
          <EmptyHeader>
            <EmptyTitle className="text-sm leading-relaxed">
              Nenhuma mensagem ainda
            </EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              As mensagens da turma aparecem aqui.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // Tailwind's `list-style: none` makes Safari drop the list semantics
        <ul role="list" aria-label="Mensagens" className="flex flex-col gap-8">
          {messages.map((message) => {
            const messageLabel = message.isOwn
              ? 'sua mensagem'
              : `mensagem de ${message.author.name}`
            const { mutableStudent } = message
            return (
              <li key={message.id}>
                <ClassMessage
                  author={message.author}
                  body={message.body}
                  date={message.date}
                  isOwn={message.isOwn}
                  removedNotice={message.removedNotice}
                >
                  {message.canRemove && (
                    <ConfirmActionDialog
                      triggerLabel={
                        <>
                          Remover
                          <span className="sr-only"> {messageLabel}</span>
                        </>
                      }
                      title="Remover mensagem?"
                      description="A mensagem sairá do mural da turma. Não é possível desfazer."
                      confirmLabel="Remover"
                      confirmPendingLabel="Removendo"
                      action={async () => {
                        const result = await removeAction(message.id)
                        // The message stays listed, so the message of an earlier removal would mislead
                        if (result.status === 'error') setFeedback(IDLE_STATE)
                        return result
                      }}
                      onSuccess={setFeedback}
                    />
                  )}
                  {muteAction && mutableStudent && (
                    <ActionButton
                      pendingLabel={
                        mutableStudent.muted ? 'Reativando' : 'Silenciando'
                      }
                      variant="outline"
                      action={() =>
                        muteAction(mutableStudent.id, !mutableStudent.muted)
                      }
                      onResult={showMuteResult}
                    >
                      {mutableStudent.muted ? 'Reativar' : 'Silenciar'}
                      <span className="sr-only"> {message.author.name}</span>
                    </ActionButton>
                  )}
                </ClassMessage>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
