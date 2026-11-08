import { describe, expect, test } from 'vitest'

import { filledSegments } from './progress'

describe('filledSegments', () => {
  test.each([
    [0, 50, 0],
    [25, 50, 10],
    [50, 50, 20]
  ])('fills %i of %i with %i segments', (value, max, segments) => {
    expect(filledSegments(value, max)).toBe(segments)
  })

  test('keeps one segment while any value is left', () => {
    expect(filledSegments(1, 1000)).toBe(1)
  })

  test('only fills the last segment at the maximum', () => {
    expect(filledSegments(999, 1000)).toBe(19)
  })

  test('stays within the bar for a value out of range', () => {
    expect(filledSegments(-5, 50)).toBe(0)
    expect(filledSegments(60, 50)).toBe(20)
  })
})
