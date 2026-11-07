'use client'

import { cn } from 'cn'
import { useEffect, useId, useState, useTransition } from 'react'

import { Button } from '@/app/components/ui/8bit/button'
import { Spinner } from '@/app/components/ui/8bit/spinner'
import { VERIFICATION_RESEND_COOLDOWN_SECONDS } from '@/models/authentication/constants'

import {
  resendVerificationEmail,
  type ResendVerificationState
} from './resend-verification-action'

const SECOND_IN_MS = 1000

const secondsText = (seconds: number) =>
  `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`

const deadlineIn = (seconds: number) => Date.now() + seconds * SECOND_IN_MS

// Rendered right after a link was sent (sign-up, or a sign-in with the email still unconfirmed), so
// the cooldown starts with it
export const ResendVerificationButton = ({
  identifier
}: {
  identifier: string
}) => {
  const [deadline, setDeadline] = useState(() =>
    deadlineIn(VERIFICATION_RESEND_COOLDOWN_SECONDS)
  )
  const [now, setNow] = useState(() => Date.now())
  const [result, setResult] = useState<ResendVerificationState>()
  const [pending, startTransition] = useTransition()
  const hintId = useId()
  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / SECOND_IN_MS))

  useEffect(() => {
    if (secondsLeft === 0) return
    const timer = setTimeout(() => setNow(Date.now()), SECOND_IN_MS)
    return () => clearTimeout(timer)
  }, [now, secondsLeft])

  const resend = () => {
    startTransition(async () => {
      const state = await resendVerificationEmail({ identifier })
      setResult(state)
      if (state.retryInSeconds) setDeadline(deadlineIn(state.retryInSeconds))
      setNow(Date.now())
    })
  }

  const waiting = pending || secondsLeft > 0
  const message = result?.status === 'idle' ? undefined : result?.message
  const action = result?.status === 'error' ? result.action : undefined
  // A cooldown's message (a new link, or when to try again) goes away with it
  const showsMessage = Boolean(
    !pending && message && (secondsLeft > 0 || !result?.retryInSeconds)
  )
  // Only after a countdown, not after an error that never started one
  const cooldownEnded = !waiting && Boolean(result?.retryInSeconds ?? !result)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Não recebeu o e-mail?
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={waiting}
        // Keeps the focus through the countdown, as SubmitButton does
        focusableWhenDisabled
        // Same lost click as SubmitButton's: the blur of an invalid field above would move the button
        onMouseDown={(event) => event.preventDefault()}
        onClick={resend}
        // A description change isn't announced, so focusing the button tells the wait without
        // reading out every second
        aria-describedby={secondsLeft > 0 ? hintId : undefined}
        className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        {pending && <Spinner aria-hidden className="size-4" />}
        Reenviar e-mail
        {!pending && secondsLeft > 0 && (
          // Two digits keep the label from shifting when the countdown drops one
          <span aria-hidden>({String(secondsLeft).padStart(2, '0')}s)</span>
        )}
      </Button>
      <span id={hintId} hidden>
        Disponível em {secondsText(secondsLeft)}.
      </span>
      {/* Announces the start of a countdown (with the result) and its end, never each second. Not
      `empty:sr-only`, for the same reason as FormMessage */}
      <div
        role="status"
        className={cn('text-xs leading-relaxed', !showsMessage && 'sr-only')}
      >
        {pending && <span>Enviando…</span>}
        {showsMessage && (
          <p
            className={cn(
              'flex flex-col gap-2',
              result?.status === 'error'
                ? 'text-destructive'
                : 'text-muted-foreground'
            )}
          >
            <span>{message}</span>
            {action && <span className="text-muted-foreground">{action}</span>}
            {result?.status === 'success' && result.retryInSeconds && (
              <span className="sr-only">
                Você poderá reenviar em {secondsText(result.retryInSeconds)}.
              </span>
            )}
          </p>
        )}
        {cooldownEnded && <span>Você já pode reenviar o e-mail.</span>}
      </div>
    </div>
  )
}
