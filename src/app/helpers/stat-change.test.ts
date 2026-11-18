import { describe, expect, test } from 'vitest'

import {
  avatarAnimationFor,
  statChangeOf,
  type StatsSnapshot
} from './stat-change'

const snapshot = (
  level: number,
  current: number,
  hp = 50,
  coins = 0
): StatsSnapshot => ({ progress: { level, current }, hp, coins })

describe('statChangeOf', () => {
  test('returns nothing when no value changed', () => {
    expect(statChangeOf(snapshot(2, 30), snapshot(2, 30))).toBeUndefined()
  })

  test('returns the XP, HP and coin deltas', () => {
    expect(
      statChangeOf(snapshot(1, 10, 50, 5), snapshot(1, 30, 45, 2))
    ).toEqual({ xp: 20, hp: -5, coins: -3 })
  })

  test('counts the XP across a level up and returns the level reached', () => {
    expect(
      statChangeOf(snapshot(1, 90, 50, 0), snapshot(2, 20, 50, 10))
    ).toEqual({ xp: 30, hp: 0, coins: 10, levelReached: 2 })
  })

  test('returns no level up when a reversal takes a level away', () => {
    expect(statChangeOf(snapshot(2, 10), snapshot(1, 90))).toEqual({
      xp: -20,
      hp: 0,
      coins: 0
    })
  })
})

describe('avatarAnimationFor', () => {
  test('plays hurt when the HP goes down, even with XP gained', () => {
    expect(avatarAnimationFor({ xp: 10, hp: -5, coins: 0 })).toBe('hurt')
  })

  test('plays cast when the XP or the HP goes up', () => {
    expect(avatarAnimationFor({ xp: 10, hp: 0, coins: 0 })).toBe('cast')
    expect(avatarAnimationFor({ xp: 0, hp: 50, coins: 0 })).toBe('cast')
  })

  test('plays nothing for a change of coins alone', () => {
    expect(avatarAnimationFor({ xp: 0, hp: 0, coins: -20 })).toBeUndefined()
  })
})
