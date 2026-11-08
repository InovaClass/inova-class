import type { z } from 'zod'

import { studentNotInClass } from '@/models/enrollment/errors'
import { type Balances, ledgerRepo } from '@/repositories/ledger-repo'

import { applyDeltas, applyReversals } from './balance'
import { batchAlreadyReversed, batchNotFound, notEnoughCoins } from './errors'
import { levelOf } from './level'
import { type LedgerEntryInput, ledgerEntrySchema } from './schema'

type ParsedEntry = Omit<z.output<typeof ledgerEntrySchema>, 'enrollmentId'>

const planEntry =
  ({ requireCoins, ...entry }: ParsedEntry) =>
  (balances: Balances) => {
    if (requireCoins && balances.coins + entry.coinDelta < 0) {
      throw notEnoughCoins()
    }
    const {
      applied,
      levelBonuses,
      balances: next
    } = applyDeltas(balances, entry)
    return {
      entry: { ...entry, ...applied },
      derivedEntries: levelBonuses.map((coinDelta) => ({
        type: 'level_bonus' as const,
        xpDelta: 0,
        hpDelta: 0,
        coinDelta,
        createdById: entry.createdById
      })),
      balances: next
    }
  }

const record = async (input: LedgerEntryInput) => {
  const { enrollmentId, ...entry } = ledgerEntrySchema.parse(input)
  const recorded = await ledgerRepo.record(enrollmentId, planEntry(entry))
  if (!recorded) throw studentNotInClass()
  return { ...recorded, level: levelOf(recorded.balances.xp) }
}

const recordBatch = async (
  enrollmentIds: string[],
  input: Omit<LedgerEntryInput, 'enrollmentId'>
) => {
  const plans = new Map(
    enrollmentIds.map((id) => {
      const { enrollmentId, ...entry } = ledgerEntrySchema.parse({
        ...input,
        enrollmentId: id
      })
      return [enrollmentId, planEntry(entry)]
    })
  )
  const batchId = await ledgerRepo.recordBatch(plans)
  if (!batchId) throw studentNotInClass()
  return batchId
}

const reverseBatch = async (
  classId: string,
  batchId: string,
  createdById: string
) => {
  const result = await ledgerRepo.reverseBatch(
    classId,
    batchId,
    (balances, entries) => {
      const { applied, balances: next } = applyReversals(balances, entries)
      return {
        reversals: entries.map(({ id, sourceId }, index) => ({
          ...applied[index]!,
          type: 'reversal' as const,
          sourceId,
          reversedEntryId: id,
          createdById
        })),
        balances: next
      }
    }
  )
  if (result === 'not_found') throw batchNotFound()
  if (result === 'already_reversed') throw batchAlreadyReversed()
}

export const ledgerModel = {
  record,
  recordBatch,
  reverseBatch
}
