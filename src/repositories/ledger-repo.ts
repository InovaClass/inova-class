import { eq } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { enrollments, ledgerEntries } from '@/infra/database/schema'

export type Balances = Pick<
  typeof enrollments.$inferSelect,
  'xp' | 'hp' | 'coins'
>

type NewEntry = Omit<
  typeof ledgerEntries.$inferInsert,
  'id' | 'enrollmentId' | 'parentEntryId' | 'createdAt'
>

export type EntryPlan = {
  entry: NewEntry
  derivedEntries: NewEntry[]
  balances: Balances
}

// The row lock makes concurrent entries of one enrollment wait for each other, so each plan starts
// from the balances the previous one left. `plan` may throw to cancel the transaction
const record = async (
  enrollmentId: string,
  plan: (balances: Balances) => EntryPlan
) =>
  database.transaction(async (transaction) => {
    const [current] = await transaction
      .select({
        xp: enrollments.xp,
        hp: enrollments.hp,
        coins: enrollments.coins
      })
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .for('update')
    if (!current) return

    const { entry, derivedEntries, balances } = plan(current)
    const [created] = await transaction
      .insert(ledgerEntries)
      .values({ ...entry, enrollmentId })
      .returning()
    const derived =
      derivedEntries.length > 0
        ? await transaction
            .insert(ledgerEntries)
            .values(
              derivedEntries.map((derivedEntry) => ({
                ...derivedEntry,
                enrollmentId,
                parentEntryId: created!.id
              }))
            )
            .returning()
        : []
    await transaction
      .update(enrollments)
      .set(balances)
      .where(eq(enrollments.id, enrollmentId))
    return { entry: created!, derivedEntries: derived, balances }
  })

export const ledgerRepo = {
  record
}
