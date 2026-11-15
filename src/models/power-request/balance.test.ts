import { describe, expect, test } from 'vitest'

import { availableCoins } from './balance'

describe('availableCoins', () => {
  test('is every coin when nothing is reserved', () => {
    expect(availableCoins(30, [])).toBe(30)
  })

  test('takes the cost of every pending request out of the coins', () => {
    expect(availableCoins(30, [{ cost: 10 }, { cost: 15 }])).toBe(5)
  })

  test('is zero when a penalty left fewer coins than the reservations hold', () => {
    expect(availableCoins(10, [{ cost: 15 }])).toBe(0)
  })
})
