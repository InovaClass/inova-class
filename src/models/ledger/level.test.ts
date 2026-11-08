import { describe, expect, test } from 'vitest'

import { levelOf, levelProgress, xpForLevel } from './level'

describe('levelProgress', () => {
  test.each([
    [0, 1, 0, 100],
    [99, 1, 99, 100],
    [100, 2, 0, 200],
    [350, 3, 50, 300]
  ])('puts %i XP at level %i, %i of %i', (xp, level, current, max) => {
    expect(levelProgress(xp)).toEqual({ level, current, max })
  })
})

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
