import type { LedgerEntryType } from '@/constants/game'

import { describeBehaviorValues } from './behavior-values'

const ENTRY_TITLES: Record<LedgerEntryType, string> = {
  behavior: 'Comportamento',
  level_bonus: 'Bônus de nível',
  reward_purchase: 'Compra de recompensa',
  reward_refund: 'Reembolso de recompensa',
  item_purchase: 'Compra de item',
  power: 'Poder',
  hp_restore: 'HP restaurado',
  quest_reward: 'Objetivo',
  quest_penalty: 'Multa por atraso',
  reversal: 'Reversão'
}

export const entryTitle = (entry: {
  type: LedgerEntryType
  behaviorName: string | null
  consequenceName: string | null
  powerName: string | null
  rewardName: string | null
  itemName: string | null
  objectiveName: string | null
}) => {
  if (entry.consequenceName) return `Consequência: ${entry.consequenceName}`
  if (entry.powerName) return `Poder: ${entry.powerName}`
  if (entry.rewardName) {
    return `${ENTRY_TITLES[entry.type]}: ${entry.rewardName}`
  }
  if (entry.itemName) return `${ENTRY_TITLES[entry.type]}: ${entry.itemName}`
  if (entry.objectiveName) return `Objetivo: ${entry.objectiveName}`
  return entry.behaviorName ?? ENTRY_TITLES[entry.type]
}

type Deltas = { xpDelta: number; hpDelta: number; coinDelta: number }

export const describeDeltas = ({ xpDelta, hpDelta, coinDelta }: Deltas) =>
  describeBehaviorValues({ xp: xpDelta, hp: hpDelta, coins: coinDelta }) ||
  'Sem alteração'

export const sumDeltas = (entries: Deltas[]) => {
  const total = { xpDelta: 0, hpDelta: 0, coinDelta: 0 }
  for (const { xpDelta, hpDelta, coinDelta } of entries) {
    total.xpDelta += xpDelta
    total.hpDelta += hpDelta
    total.coinDelta += coinDelta
  }
  return total
}

// One line per kind of derived entry, since a reward may bring both level bonuses and a late penalty
export const describeDerivedEntries = (
  entries: (Deltas & { type: LedgerEntryType })[]
) =>
  [...new Set(entries.map(({ type }) => type))].map(
    (type) =>
      `${ENTRY_TITLES[type]}: ${describeDeltas(sumDeltas(entries.filter((entry) => entry.type === type)))}`
  )
