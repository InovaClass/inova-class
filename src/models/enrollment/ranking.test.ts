import { describe, expect, test } from 'vitest'

import { rank } from './ranking'

describe('rank', () => {
  test('sorts by XP and gives tied students the same position', () => {
    const ranked = rank([
      { name: 'Bruno', xp: 50 },
      { name: 'Zeca', xp: 120 },
      { name: 'Ágata', xp: 50 },
      { name: 'Carla', xp: 0 }
    ])

    expect(ranked).toEqual([
      { name: 'Zeca', xp: 120, position: 1 },
      { name: 'Ágata', xp: 50, position: 2 },
      { name: 'Bruno', xp: 50, position: 2 },
      { name: 'Carla', xp: 0, position: 4 }
    ])
  })
})
