import { studentNotInClass } from '@/models/enrollment/errors'
import { ledgerRepo } from '@/repositories/ledger-repo'

import { applyDeltas } from './balance'
import { notEnoughCoins } from './errors'
import { levelOf } from './level'
import { type LedgerEntryInput, ledgerEntrySchema } from './schema'

const record = async (input: LedgerEntryInput) => {
  const { enrollmentId, requireCoins, ...entry } =
    ledgerEntrySchema.parse(input)
  const recorded = await ledgerRepo.record(enrollmentId, (balances) => {
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
  })
  if (!recorded) throw studentNotInClass()
  return { ...recorded, level: levelOf(recorded.balances.xp) }
}

export const ledgerModel = {
  record
}
