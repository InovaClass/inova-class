import { vi } from 'vitest'

if (!process.env.DATABASE_URL) process.loadEnvFile('.env.development')

// after() only works inside a Next.js request; here the scheduled work (sending emails) just runs
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: () => unknown) => {
    void task()
  }
}))
