'use client'

import { useEffect, useEffectEvent } from 'react'

import {
  CLASS_EVENT_TYPES,
  type ClassEventType
} from '@/models/class-event/constants'

const RETRY_MIN_MS = 1000
const RETRY_MAX_MS = 30_000

// `resync` follows a reconnection, since the events sent while the stream was down are lost
export type ClassEventSignal = ClassEventType | 'resync'

const parseClassEvent = (data: string) => {
  try {
    const { type } = JSON.parse(data) as { type?: unknown }
    return CLASS_EVENT_TYPES.find((known) => known === type)
  } catch {
    return
  }
}

const nextRetryDelay = (delay: number) => Math.min(delay * 2, RETRY_MAX_MS)

// Only a signal to fetch again: a screen keeps working with what it rendered when the stream is down
export const useClassEvents = (
  classId: string,
  onEvent: (signal: ClassEventSignal) => void
) => {
  const handle = useEffectEvent(onEvent)

  useEffect(() => {
    let source: EventSource | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    let retryDelay = RETRY_MIN_MS
    let connectedBefore = false

    const connect = () => {
      source = new EventSource(
        `/api/turmas/${encodeURIComponent(classId)}/eventos`
      )
      source.addEventListener('open', () => {
        retryDelay = RETRY_MIN_MS
        if (connectedBefore) handle('resync')
        connectedBefore = true
      })
      source.addEventListener('message', ({ data }) => {
        const type = parseClassEvent(String(data))
        if (type) handle(type)
      })
      // The browser reconnects by itself after a network error, but gives up on a response other than
      // a stream (e.g. a 503 while Redis is down), so that case retries here
      source.addEventListener('error', () => {
        if (source?.readyState !== EventSource.CLOSED) return
        retry = setTimeout(connect, retryDelay)
        retryDelay = nextRetryDelay(retryDelay)
      })
    }

    connect()
    return () => {
      clearTimeout(retry)
      source?.close()
    }
  }, [classId])
}
