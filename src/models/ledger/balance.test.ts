import { describe, expect, test } from 'vitest'

import { HP_MAX } from '@/constants/game'

import { applyDeltas, clampHp } from './balance'
import { LEVEL_BONUS_COINS } from './constants'

const noDeltas = { xpDelta: 0, hpDelta: 0, coinDelta: 0 }

describe('clampHp', () => {
  test.each([
    [-10, 0],
    [0, 0],
    [20, 20],
    [HP_MAX, HP_MAX],
    [HP_MAX + 10, HP_MAX]
  ])('turns %i HP into %i', (hp, clamped) => {
    expect(clampHp(hp)).toBe(clamped)
  })
})

describe('applyDeltas', () => {
  test('applies the deltas within the limits', () => {
    expect(
      applyDeltas(
        { xp: 10, hp: 30, coins: 5 },
        { xpDelta: 20, hpDelta: -10, coinDelta: 3 }
      )
    ).toEqual({
      applied: { xpDelta: 20, hpDelta: -10, coinDelta: 3 },
      levelBonuses: [],
      balances: { xp: 30, hp: 20, coins: 8 }
    })
  })

  test('applies only the part of the HP that fits between zero and the maximum', () => {
    expect(
      applyDeltas({ xp: 0, hp: 10, coins: 0 }, { ...noDeltas, hpDelta: -30 })
        .applied.hpDelta
    ).toBe(-10)
    expect(
      applyDeltas(
        { xp: 0, hp: HP_MAX - 5, coins: 0 },
        { ...noDeltas, hpDelta: 30 }
      ).applied.hpDelta
    ).toBe(5)
  })

  test('takes only the coins the student has', () => {
    const { applied, balances } = applyDeltas(
      { xp: 0, hp: HP_MAX, coins: 4 },
      { ...noDeltas, coinDelta: -10 }
    )
    expect(applied.coinDelta).toBe(-4)
    expect(balances.coins).toBe(0)
  })

  test('gives a bonus for each level crossed and adds it to the coins', () => {
    const { levelBonuses, balances } = applyDeltas(
      { xp: 90, hp: HP_MAX, coins: 1 },
      { ...noDeltas, xpDelta: 220 }
    )
    expect(levelBonuses).toEqual([LEVEL_BONUS_COINS, LEVEL_BONUS_COINS])
    expect(balances.coins).toBe(1 + 2 * LEVEL_BONUS_COINS)
  })

  test('gives no bonus when the XP stays in the same level or goes down', () => {
    expect(
      applyDeltas(
        { xp: 100, hp: HP_MAX, coins: 0 },
        { ...noDeltas, xpDelta: 50 }
      ).levelBonuses
    ).toEqual([])
    expect(
      applyDeltas(
        { xp: 300, hp: HP_MAX, coins: 0 },
        { ...noDeltas, xpDelta: -250 }
      ).levelBonuses
    ).toEqual([])
  })
})
