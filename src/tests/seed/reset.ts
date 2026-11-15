import { sql } from 'drizzle-orm'

import { database } from '@/infra/database/client'

import { removeCredentials } from './credentials'
import { runOnLocalDatabase } from './local-database'

await runOnLocalDatabase(async () => {
  // Drizzle keeps its migrations journal in the `drizzle` schema, so it stays and nothing re-migrates
  const { rows } = await database.execute<{ name: string }>(
    sql`select table_name as name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`
  )
  if (rows.length > 0) {
    const tables = rows.map(({ name }) => `"${name}"`).join(', ')
    await database.execute(sql.raw(`truncate table ${tables} cascade`))
  }
  await removeCredentials()
  console.log(`Emptied ${rows.length} tables and removed the credentials file`)
})
