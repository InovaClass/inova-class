'use client'

import { useState } from 'react'

import { Textarea } from '@/app/components/ui/8bit/textarea'
import { FieldFrame } from '@/app/components/ui/custom/form-field'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import { MESSAGE_MAX_LENGTH } from '@/models/message/constants'
import { type MessageInput, messageSchema } from '@/models/message/schema'

type MessageComposerProps = {
  hint: string
  action: (input: MessageInput) => Promise<FormState<MessageInput>>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const MessageComposer = ({ hint, action }: MessageComposerProps) => {
  // The form stays for the next message, so a success is only announced: FormMessage would take the
  // focus away from it
  const [posted, setPosted] = useState<FormState>(IDLE_STATE)
  const { field, state, pending, announcement, formProps, reset } =
    useFormAction({
      schema: messageSchema,
      defaultValues: { body: '' },
      action: async (input) => {
        const result = await action(input)
        setPosted(result)
        if (result.status !== 'success') return result
        reset()
        return { status: 'idle' }
      }
    })
  const { error: bodyError, ...body } = field('body')

  return (
    <form
      {...formProps}
      aria-label="Nova mensagem"
      className="flex flex-col gap-6"
    >
      <FieldFrame
        label="Mensagem"
        hint={`${hint} Até ${MESSAGE_MAX_LENGTH} caracteres.`}
        error={bodyError}
      >
        {(frameControl) => (
          // The pixel frame is drawn 1.5 spacing units outside the textarea; the margin makes room for it
          <Textarea className="my-1.5 min-h-24" {...body} {...frameControl} />
        )}
      </FieldFrame>
      <FormMessage state={state} announcement={announcement} />
      <p aria-live="polite" className="sr-only">
        {posted.status === 'success' && (
          <span key={posted.id}>{posted.message}</span>
        )}
      </p>
      {/* The frame is drawn outside the button, so it needs room for it */}
      <div className="p-1.5">
        <SubmitButton pendingLabel="Enviando" pending={pending}>
          Enviar
        </SubmitButton>
      </div>
    </form>
  )
}
