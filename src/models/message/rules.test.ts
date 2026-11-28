import { describe, expect, test } from 'vitest'

import { MESSAGE_RATE_LIMIT, MESSAGES_MAX_PAGES } from './constants'
import { boardPagesOf, canRemove, postBlockOf } from './rules'

describe('postBlockOf', () => {
  const open = { chatEnabled: true, mutedAt: null, recentCount: 0 }

  test('lets a student post to an open board', () => {
    expect(postBlockOf(open)).toBeUndefined()
  })

  test('blocks a closed board before anything else', () => {
    expect(
      postBlockOf({
        chatEnabled: false,
        mutedAt: new Date(),
        recentCount: MESSAGE_RATE_LIMIT
      })
    ).toBe('closed')
  })

  test('blocks a muted student', () => {
    expect(postBlockOf({ ...open, mutedAt: new Date() })).toBe('muted')
  })

  test('blocks a student who reached the rate limit', () => {
    expect(
      postBlockOf({ ...open, recentCount: MESSAGE_RATE_LIMIT - 1 })
    ).toBeUndefined()
    expect(postBlockOf({ ...open, recentCount: MESSAGE_RATE_LIMIT })).toBe(
      'rate-limited'
    )
  })
})

describe('canRemove', () => {
  const teacher = { id: 'teacher', role: 'teacher' } as const
  const student = { id: 'student', role: 'student' } as const

  test('lets the teacher remove any message', () => {
    expect(canRemove(teacher, { authorId: 'other', removedAt: null })).toBe(
      true
    )
  })

  test('lets a student remove only their own messages', () => {
    expect(canRemove(student, { authorId: 'student', removedAt: null })).toBe(
      true
    )
    expect(canRemove(student, { authorId: 'other', removedAt: null })).toBe(
      false
    )
    expect(canRemove(student, { authorId: 'teacher', removedAt: null })).toBe(
      false
    )
  })

  test('never removes a message twice', () => {
    const removedAt = new Date()
    expect(canRemove(teacher, { authorId: 'other', removedAt })).toBe(false)
    expect(canRemove(student, { authorId: 'student', removedAt })).toBe(false)
  })
})

describe('boardPagesOf', () => {
  test('keeps the number of pages within bounds', () => {
    expect(boardPagesOf(3)).toBe(3)
    expect(boardPagesOf(2.7)).toBe(2)
    expect(boardPagesOf(0)).toBe(1)
    expect(boardPagesOf(-2)).toBe(1)
    expect(boardPagesOf(NaN)).toBe(1)
    expect(boardPagesOf(MESSAGES_MAX_PAGES + 5)).toBe(MESSAGES_MAX_PAGES)
  })
})
