import { describe, expect, test } from 'vitest'

import { levelOf, xpForLevel } from './level'

describe('xpForLevel', () => {
  test('grows by a larger step at each level', () => {
    expect([1, 2, 3, 4, 5].map((level) => xpForLevel(level))).toEqual([
      0, 100, 300, 600, 1000
    ])
  })
})

describe('levelOf', () => {
  test.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [299, 2],
    [300, 3],
    [599, 3],
    [600, 4]
  ])('puts %i XP at level %i', (xp, level) => {
    expect(levelOf(xp)).toBe(level)
  })

  test('reaches each level exactly at its threshold, even for high levels', () => {
    for (let level = 2; level <= 500; level++) {
      expect(levelOf(xpForLevel(level))).toBe(level)
      expect(levelOf(xpForLevel(level) - 1)).toBe(level - 1)
    }
  })
})
