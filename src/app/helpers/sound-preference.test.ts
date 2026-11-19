import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  isSoundMuted,
  setSoundMuted,
  subscribeToSoundMuted
} from './sound-preference'

afterEach(() => {
  vi.restoreAllMocks()
  setSoundMuted(false)
})

describe('sound preference', () => {
  test('starts with the sound on', () => {
    expect(isSoundMuted()).toBe(false)
  })

  test('keeps the choice in the browser storage', () => {
    setSoundMuted(true)
    expect(localStorage.getItem('inova-class:sound-muted')).toBe('true')
    expect(isSoundMuted()).toBe(true)
  })

  test('notifies the subscribers of a change, here and from another tab', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToSoundMuted(listener)
    setSoundMuted(true)
    dispatchEvent(
      new StorageEvent('storage', { key: 'inova-class:sound-muted' })
    )
    unsubscribe()
    setSoundMuted(false)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  test('keeps the choice in memory when the storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    setSoundMuted(true)
    expect(isSoundMuted()).toBe(true)
  })
})
