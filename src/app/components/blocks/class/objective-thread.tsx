import type { FormState } from '@/entry/form-action'
import type { MessageInput } from '@/models/message/schema'

import { LoadEarlierLink } from './load-earlier-link'
import { type BoardMessage, MessageBoard } from './message-board'
import { MessageComposer } from './message-composer'

type ObjectiveThreadProps = {
  objectiveId: string
  objectiveName: string
  messages: BoardMessage[]
  // Without it, `notice` says why the viewer can't post
  composer?: {
    hint: string
    action: (input: MessageInput) => Promise<FormState<MessageInput>>
  }
  notice?: string
  loadEarlier?: { href: string; hasMore: boolean }
  removeAction: (messageId: string) => Promise<FormState>
  muteAction?: (studentId: string, muted: boolean) => Promise<FormState>
}

export const ObjectiveThread = ({
  objectiveId,
  objectiveName,
  messages,
  composer,
  notice,
  loadEarlier,
  removeAction,
  muteAction
}: ObjectiveThreadProps) => {
  const headingId = `discussao-${objectiveId}`

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-6 border-t border-dashed border-border pt-6"
    >
      <h4 id={headingId} className="text-xs leading-relaxed">
        Discussão<span className="sr-only"> de {objectiveName}</span>
      </h4>
      {composer ? (
        <MessageComposer
          label={`Nova mensagem na discussão de ${objectiveName}`}
          hint={composer.hint}
          action={composer.action}
        />
      ) : (
        notice && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {notice}
          </p>
        )
      )}
      <MessageBoard
        messages={messages}
        listLabel={`Mensagens da discussão de ${objectiveName}`}
        emptyDescription="As perguntas e os comentários sobre este objetivo aparecem aqui."
        removeDescription="A mensagem sairá da discussão. Não é possível desfazer."
        emptyTitleClassName="text-xs"
        clearsSuccessOnLeave
        removeAction={removeAction}
        muteAction={muteAction}
      />
      {loadEarlier && (
        <LoadEarlierLink
          href={loadEarlier.href}
          hasMore={loadEarlier.hasMore}
          linkSuffix={` da discussão de ${objectiveName}`}
        />
      )}
    </section>
  )
}
