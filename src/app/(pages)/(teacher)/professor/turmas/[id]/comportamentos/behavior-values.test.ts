import { describe, expect, test } from 'vitest'

import { describeBehaviorValues } from './behavior-values'

describe('describeBehaviorValues', () => {
  test('lists only the values the behavior changes, with their sign', () => {
    expect(describeBehaviorValues({ xp: 10, hp: 0, coins: 5 })).toBe(
      '+10 XP, +5 moedas'
    )
    expect(describeBehaviorValues({ xp: 0, hp: -5, coins: -1 })).toBe(
      '-5 HP, -1 moeda'
    )
  })
})
