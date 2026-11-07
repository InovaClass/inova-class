import { HP_MAX } from '@/constants/game'
import type { Balances } from '@/repositories/ledger-repo'

import { LEVEL_BONUS_COINS } from './constants'
import { levelOf } from './level'

export type Deltas = { xpDelta: number; hpDelta: number; coinDelta: number }

export const clampHp = (hp: number) => Math.min(Math.max(hp, 0), HP_MAX)

// An entry stores the deltas applied after clamping, so its reversal (#16) restores the balances
// exactly
export const applyDeltas = (balances: Balances, deltas: Deltas) => {
  const xp = Math.max(balances.xp + deltas.xpDelta, 0)
  const hp = clampHp(balances.hp + deltas.hpDelta)
  const coins = Math.max(balances.coins + deltas.coinDelta, 0)
  // Losing a level takes no bonus back here: the reversal of the entry also reverses its bonuses (#16)
  const levelsGained = Math.max(levelOf(xp) - levelOf(balances.xp), 0)
  return {
    applied: {
      xpDelta: xp - balances.xp,
      hpDelta: hp - balances.hp,
      coinDelta: coins - balances.coins
    },
    levelBonuses: Array.from({ length: levelsGained }, () => LEVEL_BONUS_COINS),
    balances: { xp, hp, coins: coins + levelsGained * LEVEL_BONUS_COINS }
  }
}
