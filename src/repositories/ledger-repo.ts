import { and, asc, eq, inArray } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { enrollments, ledgerEntries } from '@/infra/database/schema'

export type Balances = Pick<
  typeof enrollments.$inferSelect,
  'xp' | 'hp' | 'coins'
>

type NewEntry = Omit<
  typeof ledgerEntries.$inferInsert,
  'id' | 'enrollmentId' | 'parentEntryId' | 'batchId' | 'createdAt'
>

export type EntryPlan = {
  entry: NewEntry
  derivedEntries: NewEntry[]
  balances: Balances
}

export type RecordedEntry = Pick<
  typeof ledgerEntries.$inferSelect,
  'id' | 'xpDelta' | 'hpDelta' | 'coinDelta' | 'sourceId'
>

type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0]

const balanceColumns = {
  xp: enrollments.xp,
  hp: enrollments.hp,
  coins: enrollments.coins
}

const writePlan = async (
  transaction: Transaction,
  enrollmentId: string,
  { entry, derivedEntries, balances }: EntryPlan,
  batchId?: string
) => {
  const [created] = await transaction
    .insert(ledgerEntries)
    .values({ ...entry, enrollmentId, batchId })
    .returning()
  const derived =
    derivedEntries.length > 0
      ? await transaction
          .insert(ledgerEntries)
          .values(
            derivedEntries.map((derivedEntry) => ({
              ...derivedEntry,
              enrollmentId,
              batchId,
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
}

// Always locked in the order of the ids, so two batches over the same students can't deadlock
const lockBalances = async (
  transaction: Transaction,
  enrollmentIds: string[]
) =>
  transaction
    .select({ id: enrollments.id, ...balanceColumns })
    .from(enrollments)
    .where(inArray(enrollments.id, enrollmentIds))
    .orderBy(asc(enrollments.id))
    .for('update')

// The row lock makes concurrent entries of one enrollment wait for each other, so each plan starts
// from the balances the previous one left. `plan` may throw to cancel the transaction
const record = async (
  enrollmentId: string,
  plan: (balances: Balances) => EntryPlan
) =>
  database.transaction(async (transaction) => {
    const [current] = await transaction
      .select(balanceColumns)
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .for('update')
    if (!current) return

    return writePlan(transaction, enrollmentId, plan(current))
  })

// All or nothing: a batch never reaches only part of the students
const recordBatch = async (
  plans: Map<string, (balances: Balances) => EntryPlan>
) =>
  database.transaction(async (transaction) => {
    const locked = await lockBalances(transaction, plans.keys().toArray())
    if (locked.length !== plans.size) return

    const batchId = crypto.randomUUID()
    for (const { id, ...balances } of locked) {
      await writePlan(transaction, id, plans.get(id)!(balances), batchId)
    }
    return batchId
  })

// The reversals carry no `batchId`, so a batch only ever lists the entries it applied
const reverseBatch = async (
  classId: string,
  batchId: string,
  plan: (
    balances: Balances,
    entries: RecordedEntry[]
  ) => { reversals: NewEntry[]; balances: Balances }
) =>
  database.transaction(async (transaction) => {
    const entries = await transaction
      .select({
        id: ledgerEntries.id,
        enrollmentId: ledgerEntries.enrollmentId,
        xpDelta: ledgerEntries.xpDelta,
        hpDelta: ledgerEntries.hpDelta,
        coinDelta: ledgerEntries.coinDelta,
        sourceId: ledgerEntries.sourceId
      })
      .from(ledgerEntries)
      .innerJoin(enrollments, eq(enrollments.id, ledgerEntries.enrollmentId))
      .where(
        and(
          eq(ledgerEntries.batchId, batchId),
          eq(enrollments.classId, classId)
        )
      )
    if (entries.length === 0) return 'not_found' as const

    const locked = await lockBalances(transaction, [
      ...new Set(entries.map(({ enrollmentId }) => enrollmentId))
    ])
    // After the lock, so a concurrent undo of the same batch is seen here
    const alreadyReversed = await transaction
      .select({ id: ledgerEntries.id })
      .from(ledgerEntries)
      .where(
        inArray(
          ledgerEntries.reversedEntryId,
          entries.map(({ id }) => id)
        )
      )
      .limit(1)
    if (alreadyReversed.length > 0) return 'already_reversed' as const

    for (const { id: enrollmentId, ...current } of locked) {
      const { reversals, balances } = plan(
        current,
        entries.filter((entry) => entry.enrollmentId === enrollmentId)
      )
      await transaction
        .insert(ledgerEntries)
        .values(reversals.map((entry) => ({ ...entry, enrollmentId })))
      await transaction
        .update(enrollments)
        .set(balances)
        .where(eq(enrollments.id, enrollmentId))
    }
    return 'reversed' as const
  })

export const ledgerRepo = {
  record,
  recordBatch,
  reverseBatch
}
