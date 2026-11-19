import { describe, expect, test } from 'vitest'

import { createRepeatGuard } from './game-sound'

describe('createRepeatGuard', () => {
  test('lets a key through once within the window', () => {
    const shouldPlay = createRepeatGuard(150)
    expect(shouldPlay('hurt', 1000)).toBe(true)
    expect(shouldPlay('hurt', 1100)).toBe(false)
  })

  test('lets the key through again once the window has passed', () => {
    const shouldPlay = createRepeatGuard(150)
    shouldPlay('hurt', 1000)
    expect(shouldPlay('hurt', 1150)).toBe(true)
  })

  test('counts the window from the last sound played, not the last one dropped', () => {
    const shouldPlay = createRepeatGuard(150)
    shouldPlay('hurt', 1000)
    shouldPlay('hurt', 1100)
    expect(shouldPlay('hurt', 1160)).toBe(true)
  })

  test('keeps a window per key', () => {
    const shouldPlay = createRepeatGuard(150)
    shouldPlay('hurt', 1000)
    expect(shouldPlay('level-up', 1000)).toBe(true)
  })
})
