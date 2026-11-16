import type { LedgerEntryType } from '@/constants/game'

import { describeBehaviorValues } from './behavior-values'

const ENTRY_TITLES: Record<LedgerEntryType, string> = {
  behavior: 'Comportamento',
  level_bonus: 'Bônus de nível',
  reward_purchase: 'Compra de recompensa',
  reward_refund: 'Reembolso de recompensa',
  power: 'Poder',
  hp_restore: 'HP restaurado',
  reversal: 'Reversão'
}

export const entryTitle = (entry: {
  type: LedgerEntryType
  behaviorName: string | null
  consequenceName: string | null
  powerName: string | null
  rewardName: string | null
}) => {
  if (entry.consequenceName) return `Consequência: ${entry.consequenceName}`
  if (entry.powerName) return `Poder: ${entry.powerName}`
  if (entry.rewardName) {
    return `${ENTRY_TITLES[entry.type]}: ${entry.rewardName}`
  }
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
