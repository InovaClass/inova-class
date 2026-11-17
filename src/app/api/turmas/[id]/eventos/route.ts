import type { NextRequest } from 'next/server'

import { getSession } from '@/entry/session'
import { classEventModel } from '@/models/class-event/model'

// Under the idle timeout of common proxies, which would otherwise close a quiet stream
const HEARTBEAT_INTERVAL_MS = 25_000

const encoder = new TextEncoder()

const release = async (unsubscribe: () => Promise<void>) => {
  try {
    await unsubscribe()
  } catch (error) {
    console.error(error)
  }
}

// Server-Sent Events instead of a WebSocket: the events only go from the server to the screens, and
// `upgradeWebSocket()` from `@vercel/functions` needs the Vercel runtime, which `next dev` lacks (#23)
export const GET = async (
  request: NextRequest,
  context: RouteContext<'/api/turmas/[id]/eventos'>
) => {
  const session = await getSession()
  if (!session) return new Response(null, { status: 401 })
  const { id } = await context.params

  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  const send = (chunk: string) => controller?.enqueue(encoder.encode(chunk))

  let unsubscribe: (() => Promise<void>) | undefined
  try {
    unsubscribe = await classEventModel.listen(session.user, id, (message) =>
      send(`data: ${message}\n\n`)
    )
  } catch (error) {
    console.error(error)
    return new Response(null, { status: 503 })
  }
  if (!unsubscribe) return new Response(null, { status: 404 })

  const heartbeat = setInterval(
    () => send(': heartbeat\n\n'),
    HEARTBEAT_INTERVAL_MS
  )
  const stop = () => {
    if (!controller) return
    controller = undefined
    clearInterval(heartbeat)
    void release(unsubscribe)
  }

  const stream = new ReadableStream<Uint8Array>({
    start: (streamController) => {
      controller = streamController
      // Sends the headers right away, so the browser fires `open` without waiting for an event
      send(': connected\n\n')
    },
    cancel: stop
  })
  const close = () => {
    const openController = controller
    stop()
    openController?.close()
  }
  if (request.signal.aborted) close()
  request.signal.addEventListener('abort', close, { once: true })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  })
}
