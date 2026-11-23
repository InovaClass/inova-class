import { describe, expect, test } from 'vitest'

import { moveItem } from './order'

describe('moveItem', () => {
  test('swaps the item with the one before it when moving up', () => {
    expect(moveItem(['a', 'b', 'c'], 'c', 'up')).toEqual(['a', 'c', 'b'])
  })

  test('swaps the item with the one after it when moving down', () => {
    expect(moveItem(['a', 'b', 'c'], 'a', 'down')).toEqual(['b', 'a', 'c'])
  })

  test('keeps the order when the item is already at that end', () => {
    expect(moveItem(['a', 'b'], 'a', 'up')).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 'b', 'down')).toEqual(['a', 'b'])
  })

  test("gives undefined for an item that isn't listed", () => {
    expect(moveItem(['a', 'b'], 'c', 'up')).toBe(undefined)
  })
})
