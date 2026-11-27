'use client'

import { cn } from 'cn'
import { motion, MotionConfig, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import {
  useActionState,
  useEffect,
  useEffectEvent,
  useRef,
  useState
} from 'react'

import {
  rouletteDelayAt,
  rouletteNames
} from '@/app/(pages)/(teacher)/professor/turmas/[id]/alunos/[student-id]/sorteio/roulette'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import { useGameSound } from '@/app/hooks/use-game-sound'
import { HP_MAX } from '@/constants/game'
import type { FormState } from '@/entry/form-action'

type DrawPanelProps = {
  classId: string
  studentLabel: string
  fallen: boolean
  consequenceNames: string[]
  drawAction: () => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

const BODY_TEXT_CLASSES = 'text-xs leading-relaxed wrap-anywhere'

// The last name stays on screen a moment before the result replaces the roulette
const LAST_NAME_HELD_FOR_IN_MS = 700

const DrawRoulette = ({
  names,
  result,
  onDone
}: {
  names: string[]
  result: string
  onDone: () => void
}) => {
  const reducedMotion = useReducedMotion()
  const [sequence] = useState(() =>
    rouletteNames(names, result, Math.floor(Math.random() * names.length))
  )
  const [step, setStep] = useState(0)
  const done = useEffectEvent(onDone)
  const roulette = useRef<HTMLDivElement>(null)
  const last = step === sequence.length - 1

  // The button that was pressed is gone, and the focus would drop to the body
  useEffect(() => {
    roulette.current?.focus()
  }, [])

  useEffect(() => {
    if (reducedMotion) return done()
    const timer = last
      ? setTimeout(done, LAST_NAME_HELD_FOR_IN_MS)
      : setTimeout(() => setStep(step + 1), rouletteDelayAt(step))
    return () => clearTimeout(timer)
  }, [reducedMotion, last, step])

  return (
    <div
      ref={roulette}
      tabIndex={-1}
      className="flex flex-col gap-4 outline-none"
    >
      <p className={`${BODY_TEXT_CLASSES} text-muted-foreground`}>
        Sorteando...
      </p>
      <motion.p
        key={step}
        aria-hidden="true"
        className={cn(
          'pixel-border w-fit px-2 py-1 text-sm leading-relaxed wrap-anywhere',
          last && 'bg-hp text-neutral-950'
        )}
        initial={last ? { scale: 0.8 } : { y: -8 }}
        animate={last ? { scale: [0.8, 1.1, 1] } : { y: 0 }}
        transition={{ duration: last ? 0.3 : 0.05 }}
      >
        {sequence[step]}
      </motion.p>
    </div>
  )
}

const DrawResult = ({
  consequence,
  studentLabel
}: {
  consequence: string
  studentLabel: string
}) => {
  const result = useRef<HTMLDivElement>(null)
  useGameSound('draw', consequence)

  // The button that was pressed is gone, and the focus would drop to the body
  useEffect(() => {
    result.current?.focus()
  }, [])

  return (
    <div
      ref={result}
      tabIndex={-1}
      className="flex flex-col gap-4 outline-none"
    >
      <p className={`${BODY_TEXT_CLASSES} text-muted-foreground`}>
        Consequência sorteada
      </p>
      <p className="text-sm leading-relaxed wrap-anywhere">{consequence}</p>
      <p className={BODY_TEXT_CLASSES}>
        {studentLabel} está de volta com {HP_MAX} de HP.
      </p>
    </div>
  )
}

export const DrawPanel = ({
  classId,
  studentLabel,
  fallen,
  consequenceNames,
  drawAction
}: DrawPanelProps) => {
  const [state, dispatch, pending] = useActionState(drawAction, IDLE_STATE)
  const [revealedId, setRevealedId] = useState<string>()
  const drawn = state.status === 'success' ? state : undefined
  const revealed = drawn !== undefined && drawn.id === revealedId

  const renderContent = () => {
    if (!fallen) {
      return (
        <p className={BODY_TEXT_CLASSES}>
          {studentLabel} ainda tem HP. Não há o que sortear.
        </p>
      )
    }
    if (consequenceNames.length === 0) {
      return (
        <>
          <p className={BODY_TEXT_CLASSES}>
            {studentLabel} ficou sem HP, mas a turma não tem consequências para
            sortear.
          </p>
          <Link
            href={`/professor/turmas/${classId}/consequencias/novo`}
            className="w-fit text-xs underline underline-offset-4"
          >
            Cadastrar consequência
          </Link>
        </>
      )
    }
    return (
      <form action={dispatch} className="flex flex-col gap-6">
        <p className={BODY_TEXT_CLASSES}>
          {studentLabel} ficou sem HP. O sorteio escolhe uma consequência da
          lista da turma e devolve o HP.
        </p>
        <FormMessage state={state} />
        <div className="p-1.5">
          <SubmitButton pendingLabel="Sorteando" pending={pending}>
            Sortear
          </SubmitButton>
        </div>
      </form>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-sm leading-relaxed">Sorteio</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Stays mounted so the result is announced whole, since the focus may only read its first
        line */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className={cn(!revealed && 'sr-only')}
          >
            {revealed && (
              <DrawResult
                consequence={drawn.message}
                studentLabel={studentLabel}
              />
            )}
          </div>
          {drawn && !revealed && (
            <DrawRoulette
              names={consequenceNames}
              result={drawn.message}
              onDone={() => setRevealedId(drawn.id)}
            />
          )}
          {/* Before the HP check: the draw restores the HP, and the page returns with it full */}
          {!drawn && renderContent()}
        </CardContent>
      </Card>
    </MotionConfig>
  )
}
