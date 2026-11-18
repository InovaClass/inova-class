import { act, renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import type { StatsSnapshot } from '@/app/helpers/stat-change'

import { useStatChanges } from './use-stat-changes'

const snapshot = (level: number, current: number, hp = 50): StatsSnapshot => ({
  progress: { level, current },
  hp,
  coins: 0
})

const renderStats = (initial: StatsSnapshot) =>
  renderHook(({ stats }) => useStatChanges(stats), {
    initialProps: { stats: initial }
  })

describe('useStatChanges', () => {
  test('reports nothing for the values of the first render', () => {
    const { result } = renderStats(snapshot(1, 10))

    expect(result.current.changes).toEqual([])
    expect(result.current.levelUp).toBeUndefined()
  })

  test('reports nothing when a render brings the same values again', () => {
    const { result, rerender } = renderStats(snapshot(1, 10))

    rerender({ stats: snapshot(1, 10) })

    expect(result.current.changes).toEqual([])
  })

  test('adds each change with its own id until it is dismissed', () => {
    const { result, rerender } = renderStats(snapshot(1, 10))

    rerender({ stats: snapshot(1, 20) })
    rerender({ stats: snapshot(1, 20, 45) })

    expect(result.current.changes).toEqual([
      { id: 0, xp: 10, hp: 0, coins: 0 },
      { id: 1, xp: 0, hp: -5, coins: 0 }
    ])
    expect(result.current.latest?.id).toBe(1)

    act(() => result.current.dismiss(0))

    expect(result.current.changes.map(({ id }) => id)).toEqual([1])
  })

  test('keeps the level-up after its change is dismissed', () => {
    const { result, rerender } = renderStats(snapshot(1, 90))

    rerender({ stats: snapshot(2, 10) })
    act(() => result.current.dismiss(0))

    expect(result.current.levelUp).toEqual({ id: 0, level: 2 })

    act(() => result.current.dismissLevelUp())

    expect(result.current.levelUp).toBeUndefined()
  })
})
