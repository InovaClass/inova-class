import { setTimeout } from 'node:timers/promises'

import { createClient } from 'redis'

const READY_TIMEOUT_MS = 1000

// Without the offline queue a command fails while Redis is unreachable instead of waiting for it, so
// a mutation never hangs on its event
const createRedisClient = (url: string) =>
  createClient({ url, disableOfflineQueue: true })

type Connection = {
  client: ReturnType<typeof createRedisClient>
  ready: Promise<void>
}

// One publisher and one subscriber per instance: a connection in subscriber mode can't publish, and
// every stream of the instance shares the subscriber, which keeps one listener per stream
const connections: { publisher?: Connection; subscriber?: Connection } = {}

const requireUrl = () => {
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL is not set')
  return url
}

const connectionOf = (role: keyof typeof connections) => {
  const existing = connections[role]
  if (existing) return existing
  const client = createRedisClient(requireUrl())
  client.on('error', (error) => console.error(error))
  const ready = (async () => {
    try {
      await client.connect()
    } catch {
      // Already reported by the error listener; `whenReady` tells the caller
    }
  })()
  const connection = { client, ready }
  connections[role] = connection
  return connection
}

const whenReady = async ({ client, ready }: Connection) => {
  if (!client.isReady) await Promise.race([ready, setTimeout(READY_TIMEOUT_MS)])
  if (!client.isReady) throw new Error('Redis is not ready')
  return client
}

export const isRealtimeEnabled = () => Boolean(process.env.REDIS_URL)

export const publish = async (channel: string, message: string) => {
  const client = await whenReady(connectionOf('publisher'))
  await client.publish(channel, message)
}

export const subscribe = async (
  channel: string,
  listener: (message: string) => void
) => {
  const client = await whenReady(connectionOf('subscriber'))
  await client.subscribe(channel, listener)
  return async () => {
    await client.unsubscribe(channel, listener)
  }
}

// For scripts that run outside Next.js, whose process only exits once every connection is closed
export const closeRealtime = () => {
  for (const role of ['publisher', 'subscriber'] as const) {
    connections[role]?.client.destroy()
    delete connections[role]
  }
}
