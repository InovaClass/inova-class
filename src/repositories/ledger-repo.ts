import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { database } from '@/infra/database/client'
import {
  accounts,
  behaviors,
  enrollments,
  ledgerEntries,
  users
} from '@/infra/database/schema'

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
  'id' | 'type' | 'xpDelta' | 'hpDelta' | 'coinDelta' | 'sourceId'
>

type ReversalPlan = { reversals: NewEntry[]; balances: Balances }

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

const recordedColumns = {
  id: ledgerEntries.id,
  enrollmentId: ledgerEntries.enrollmentId,
  type: ledgerEntries.type,
  xpDelta: ledgerEntries.xpDelta,
  hpDelta: ledgerEntries.hpDelta,
  coinDelta: ledgerEntries.coinDelta,
  sourceId: ledgerEntries.sourceId
}

const hasReversal = async (transaction: Transaction, entryIds: string[]) => {
  const reversals = await transaction
    .select({ id: ledgerEntries.id })
    .from(ledgerEntries)
    .where(inArray(ledgerEntries.reversedEntryId, entryIds))
    .limit(1)
  return reversals.length > 0
}

const writeReversals = async (
  transaction: Transaction,
  enrollmentId: string,
  { reversals, balances }: ReversalPlan
) => {
  await transaction
    .insert(ledgerEntries)
    .values(reversals.map((entry) => ({ ...entry, enrollmentId })))
  await transaction
    .update(enrollments)
    .set(balances)
    .where(eq(enrollments.id, enrollmentId))
}

// The reversals carry no `batchId`, so a batch only ever lists the entries it applied
const reverseBatch = async (
  classId: string,
  batchId: string,
  plan: (balances: Balances, entries: RecordedEntry[]) => ReversalPlan
) =>
  database.transaction(async (transaction) => {
    const entries = await transaction
      .select(recordedColumns)
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
    if (
      await hasReversal(
        transaction,
        entries.map(({ id }) => id)
      )
    ) {
      return 'already_reversed' as const
    }

    for (const { id: enrollmentId, ...current } of locked) {
      await writeReversals(
        transaction,
        enrollmentId,
        plan(
          current,
          entries.filter((entry) => entry.enrollmentId === enrollmentId)
        )
      )
    }
    return 'reversed' as const
  })

// `plan` may throw to cancel the transaction
const reverseEntry = async (
  classId: string,
  entryId: string,
  plan: (
    balances: Balances,
    entries: RecordedEntry[],
    enrollment: { endedAt: Date | null }
  ) => ReversalPlan
) =>
  database.transaction(async (transaction) => {
    const entryAndDerived = or(
      eq(ledgerEntries.id, entryId),
      eq(ledgerEntries.parentEntryId, entryId)
    )
    const entries = await transaction
      .select(recordedColumns)
      .from(ledgerEntries)
      .innerJoin(enrollments, eq(enrollments.id, ledgerEntries.enrollmentId))
      .where(and(entryAndDerived, eq(enrollments.classId, classId)))
    const enrollmentId = entries[0]?.enrollmentId
    if (!enrollmentId) return 'not_found' as const

    const [locked] = await transaction
      .select({ ...balanceColumns, endedAt: enrollments.endedAt })
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .for('update')
    // After the lock, so a concurrent reversal of the same entry is seen here
    if (
      await hasReversal(
        transaction,
        entries.map(({ id }) => id)
      )
    ) {
      return 'already_reversed' as const
    }

    const { endedAt, ...balances } = locked!
    await writeReversals(
      transaction,
      enrollmentId,
      plan(balances, entries, { endedAt })
    )
    return 'reversed' as const
  })

const entryAuthors = alias(users, 'entry_authors')

const deltaColumns = {
  xpDelta: ledgerEntries.xpDelta,
  hpDelta: ledgerEntries.hpDelta,
  coinDelta: ledgerEntries.coinDelta
}

const listHistory = async (
  classId: string,
  {
    studentId,
    limit,
    offset
  }: { studentId?: string; limit: number; offset: number }
) => {
  const entries = await database
    .select({
      id: ledgerEntries.id,
      type: ledgerEntries.type,
      ...deltaColumns,
      createdAt: ledgerEntries.createdAt,
      studentId: enrollments.studentId,
      studentName: users.name,
      studentEmail: users.email,
      studentUsername: users.username,
      // A subquery, since a join would repeat the entry for a user with two accounts
      studentPending: sql<boolean>`not exists (select 1 from ${accounts} where ${accounts.userId} = ${users.id})`,
      enrollmentEndedAt: enrollments.endedAt,
      behaviorName: behaviors.name,
      authorName: entryAuthors.name
    })
    .from(ledgerEntries)
    .innerJoin(enrollments, eq(enrollments.id, ledgerEntries.enrollmentId))
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .leftJoin(
      behaviors,
      and(
        eq(behaviors.id, ledgerEntries.sourceId),
        eq(ledgerEntries.type, 'behavior')
      )
    )
    .leftJoin(entryAuthors, eq(entryAuthors.id, ledgerEntries.createdById))
    .where(
      and(
        eq(enrollments.classId, classId),
        studentId ? eq(enrollments.studentId, studentId) : undefined,
        isNull(ledgerEntries.parentEntryId),
        ne(ledgerEntries.type, 'reversal')
      )
    )
    // A batch shares one timestamp, so the id keeps the pages stable
    .orderBy(desc(ledgerEntries.createdAt), desc(ledgerEntries.id))
    .limit(limit)
    .offset(offset)
  if (entries.length === 0) return []

  const entryIds = entries.map(({ id }) => id)
  const derivedEntries = await database
    .select({
      id: ledgerEntries.id,
      parentEntryId: ledgerEntries.parentEntryId,
      type: ledgerEntries.type,
      ...deltaColumns
    })
    .from(ledgerEntries)
    .where(inArray(ledgerEntries.parentEntryId, entryIds))
  const reversals = await database
    .select({
      reversedEntryId: ledgerEntries.reversedEntryId,
      createdAt: ledgerEntries.createdAt,
      ...deltaColumns
    })
    .from(ledgerEntries)
    .where(
      inArray(ledgerEntries.reversedEntryId, [
        ...entryIds,
        ...derivedEntries.map(({ id }) => id)
      ])
    )

  return entries.map((entry) => {
    const derived = derivedEntries.filter(
      ({ parentEntryId }) => parentEntryId === entry.id
    )
    const entryAndDerivedIds = new Set([
      entry.id,
      ...derived.map(({ id }) => id)
    ])
    return {
      ...entry,
      derivedEntries: derived,
      reversals: reversals.filter(
        ({ reversedEntryId }) =>
          reversedEntryId && entryAndDerivedIds.has(reversedEntryId)
      )
    }
  })
}

export const ledgerRepo = {
  record,
  recordBatch,
  reverseBatch,
  reverseEntry,
  listHistory
}
