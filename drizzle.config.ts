import { defineConfig } from 'drizzle-kit'

// Hosted environments (Neon, #2) inject DATABASE_URL; only local runs read the committed file
if (!process.env.DATABASE_URL) process.loadEnvFile('.env.development')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/database/schema.ts',
  out: './src/infra/database/migrations',
  dbCredentials: { url: process.env.DATABASE_URL! }
})
