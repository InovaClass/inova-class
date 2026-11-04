import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: false,
  // With a cold `.next`, the default of half the cores compiles too many routes at once locally and
  // tests time out; CI runners have few cores, so their default is already low
  workers: process.env.CI ? undefined : 3,
  // `pnpm dev` compiles each route on its first request, which on a cold CI runner can outlast the
  // default 5s of an assertion that waits for a navigation (#5) and the default 30s of a test
  timeout: 60_000,
  expect: { timeout: 15_000 },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: 'http://localhost:3000'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
