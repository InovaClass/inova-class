import { describe, expect, test } from 'vitest'

import { pickRandom } from './draw'

describe('pickRandom', () => {
  const items = ['a', 'b', 'c']

  test.each([
    [0, 'a'],
    [0.34, 'b'],
    [0.99, 'c']
  ])('maps the random value %d to item %s', (value, expected) => {
    expect(pickRandom(items, () => value)).toBe(expected)
  })

  test('finds nothing in an empty list', () => {
    expect(pickRandom([], () => 0.5)).toBeUndefined()
  })
})
