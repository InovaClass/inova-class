import { database } from '@/infra/database/client'

// The scripts insert accounts with a known password, so they must never reach a hosted database
const requireLocalDatabase = () => {
  const url = process.env.DATABASE_URL
  const host = url ? URL.parse(url)?.hostname : undefined
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      `The seed scripts only run against the local database, not ${host ?? 'an unset DATABASE_URL'}`
    )
  }
}

export const runOnLocalDatabase = async (task: () => Promise<void>) => {
  try {
    requireLocalDatabase()
    await task()
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    await database.$client.end()
  }
}
