import { describe, expect, test } from 'vitest'

import { kindOf } from './kind'

describe('kindOf', () => {
  test.each([
    [{ xp: 10, hp: 0, coins: 5 }, 'positive'],
    [{ xp: 0, hp: 5, coins: 0 }, 'positive'],
    [{ xp: 0, hp: -5, coins: -5 }, 'negative'],
    [{ xp: 0, hp: 0, coins: 0 }, undefined],
    [{ xp: 10, hp: -5, coins: 0 }, undefined],
    [{ xp: 0, hp: -5, coins: 5 }, undefined]
  ])('classifies %o as %s', (values, kind) => {
    expect(kindOf(values)).toBe(kind)
  })
})
