import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Next.js resolves `server-only` internally; outside it the import has to be a no-op
      'server-only': 'next/dist/compiled/server-only/empty.js'
    }
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, 'src/tests/**'],
          setupFiles: ['vitest.setup.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/tests/integration/**/*.test.ts'],
          setupFiles: ['src/tests/integration/setup.ts'],
          // The files share one database and one Mailpit inbox
          fileParallelism: false,
          testTimeout: 15_000,
          // Emails go out one at a time after the call, and under the whole suite they can take more
          // than the default 1 second to reach Mailpit, as long as `waitForLinkSentTo` waits
          expect: { poll: { timeout: 10_000 } }
        }
      }
    ]
  }
})
