import { setTimeout } from 'node:timers/promises'

import pg from 'pg'

const TIMEOUT_MS = 30_000
const INTERVAL_MS = 500

if (!process.env.DATABASE_URL) process.loadEnvFile('.env.development')

const isReady = async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    await client.query('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    await client.end()
  }
}

const deadline = Date.now() + TIMEOUT_MS
process.stdout.write('Waiting for the database')

while (!(await isReady())) {
  if (Date.now() > deadline) {
    process.stdout.write('\n')
    throw new Error(`Database not ready after ${TIMEOUT_MS / 1000}s`)
  }
  process.stdout.write('.')
  await setTimeout(INTERVAL_MS)
}

process.stdout.write(' ready\n')
