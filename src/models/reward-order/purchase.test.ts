import { describe, expect, test } from 'vitest'

import { checkPurchase } from './purchase'

describe('checkPurchase', () => {
  test('accepts a purchase the available coins cover', () => {
    expect(() =>
      checkPurchase({ availableCoins: 20, price: 20, stock: 1 })
    ).not.toThrow()
  })

  test('accepts a reward without a stock limit', () => {
    expect(() =>
      checkPurchase({ availableCoins: 20, price: 10, stock: null })
    ).not.toThrow()
  })

  test('rejects a purchase above the available coins', () => {
    expect(() =>
      checkPurchase({ availableCoins: 19, price: 20, stock: null })
    ).toThrow('Você não tem moedas disponíveis suficientes.')
  })

  test('rejects a sold out reward, even with enough coins', () => {
    expect(() =>
      checkPurchase({ availableCoins: 100, price: 10, stock: 0 })
    ).toThrow('Essa recompensa esgotou.')
  })
})
