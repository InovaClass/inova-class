import { describe, expect, test } from 'vitest'

import { ROULETTE_STEPS, rouletteNames } from './roulette'

describe('rouletteNames', () => {
  test('cycles through the other names from the start and stops on the result', () => {
    const names = rouletteNames(['A', 'B', 'C'], 'B', 1)

    expect(names).toHaveLength(ROULETTE_STEPS)
    expect(names.slice(0, 4)).toEqual(['C', 'A', 'C', 'A'])
    expect(names.at(-1)).toBe('B')
    expect(names.slice(0, -1)).not.toContain('B')
  })

  test('repeats the result when it is the only name', () => {
    expect(rouletteNames(['A'], 'A', 3)).toEqual(
      Array.from({ length: ROULETTE_STEPS }, () => 'A')
    )
  })
})
