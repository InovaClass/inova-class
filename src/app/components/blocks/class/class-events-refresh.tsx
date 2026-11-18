'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useTransition } from 'react'

import { restoreLostFocus } from '@/app/helpers/restore-lost-focus'
import { useClassEvents } from '@/app/hooks/use-class-events'
import type { ClassEventType } from '@/models/class-event/constants'

type ClassEventsRefreshProps = {
  classId: string
  events: readonly ClassEventType[]
}

// A refresh renders the page again through the reads that already check who sees what, and keeps
// the client state of whatever stays on the page (the selected students, a draw result)
export const ClassEventsRefresh = ({
  classId,
  events
}: ClassEventsRefreshProps) => {
  const router = useRouter()
  const [refreshing, startTransition] = useTransition()
  const focusedBefore = useRef<Element | null>(null)

  useClassEvents(classId, (signal) => {
    if (signal !== 'resync' && !events.includes(signal)) return
    focusedBefore.current ??= document.activeElement
    startTransition(() => router.refresh())
  })

  useEffect(() => {
    if (refreshing) return
    restoreLostFocus(focusedBefore.current)
    focusedBefore.current = null
  }, [refreshing])

  return null
}
