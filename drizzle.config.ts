import { defineConfig } from 'drizzle-kit'

// Hosted environments (Neon, #2) inject DATABASE_URL; only local runs read the committed file
if (!process.env.DATABASE_URL) process.loadEnvFile('.env.development')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/database/schema.ts',
  out: './src/infra/database/migrations',
  // Neon's pooled URL goes through PgBouncer in transaction mode, which isn't meant for migrations:
  // https://neon.com/docs/connect/connection-pooling#connection-pooling-in-transaction-mode
  dbCredentials: {
    url: (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL)!
  }
})
