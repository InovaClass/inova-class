import { describe, expect, test } from 'vitest'

import {
  currentObjectiveIndex,
  isAvailable,
  isLate,
  latePenaltyOf,
  objectiveStatesOf
} from './rules'

describe('isLate', () => {
  test('is on time until the end of the due date in São Paulo', () => {
    // 23:59 on the due date in São Paulo, already the next day in UTC
    expect(isLate(new Date('2026-11-24T02:59:00Z'), '2026-11-23')).toBe(false)
  })

  test('is late from the start of the next day in São Paulo', () => {
    expect(isLate(new Date('2026-11-24T03:00:00Z'), '2026-11-23')).toBe(true)
  })

  test('is never late without a due date', () => {
    expect(isLate(new Date('2030-01-01T00:00:00Z'), null)).toBe(false)
  })
})

describe('latePenaltyOf', () => {
  const late = new Date('2026-11-25T12:00:00Z')

  test('gives the penalty of a late submission', () => {
    const objective = {
      dueOn: '2026-11-23',
      latePenaltyCoins: 3,
      latePenaltyHp: 5
    }
    expect(latePenaltyOf(objective, late)).toEqual({ coins: 3, hp: 5 })
  })

  test('gives nothing for a submission on time', () => {
    const objective = {
      dueOn: '2026-11-30',
      latePenaltyCoins: 3,
      latePenaltyHp: 5
    }
    expect(latePenaltyOf(objective, late)).toBeUndefined()
  })

  test('gives nothing for a late submission of an objective without a penalty', () => {
    const objective = {
      dueOn: '2026-11-23',
      latePenaltyCoins: 0,
      latePenaltyHp: 0
    }
    expect(latePenaltyOf(objective, late)).toBeUndefined()
  })
})

describe('isAvailable', () => {
  const objectiveIds = ['first', 'second', 'third']

  test('opens the first objective without any submission', () => {
    expect(isAvailable(objectiveIds, new Set(), 'first')).toBe(true)
  })

  test('opens an objective once the previous one has a submission', () => {
    expect(isAvailable(objectiveIds, new Set(['first']), 'second')).toBe(true)
  })

  test('keeps an objective locked while the previous one has no submission', () => {
    expect(isAvailable(objectiveIds, new Set(['first']), 'third')).toBe(false)
  })

  test('rejects an objective outside the mission', () => {
    expect(isAvailable(objectiveIds, new Set(objectiveIds), 'other')).toBe(
      false
    )
  })
})

describe('objectiveStatesOf', () => {
  const objectiveIds = ['first', 'second', 'third']

  test('opens only the first objective before any submission', () => {
    expect(objectiveStatesOf(objectiveIds, new Map())).toEqual([
      'available',
      'locked',
      'locked'
    ])
  })

  test('takes the state of the latest submission and opens the next objective', () => {
    expect(
      objectiveStatesOf(
        objectiveIds,
        new Map([
          ['first', 'approved'],
          ['second', 'pending']
        ])
      )
    ).toEqual(['approved', 'pending', 'available'])
  })

  test('opens the next objective after a returned one', () => {
    expect(
      objectiveStatesOf(objectiveIds, new Map([['first', 'returned']]))
    ).toEqual(['returned', 'available', 'locked'])
  })

  test('locks a returned objective whose previous one has no submission', () => {
    expect(
      objectiveStatesOf(objectiveIds, new Map([['second', 'returned']]))
    ).toEqual(['available', 'locked', 'available'])
  })

  test('keeps a pending or approved objective even when the previous one has no submission', () => {
    expect(
      objectiveStatesOf(
        objectiveIds,
        new Map([
          ['second', 'approved'],
          ['third', 'pending']
        ])
      )
    ).toEqual(['available', 'approved', 'pending'])
  })
})

describe('currentObjectiveIndex', () => {
  test('points to the first objective the student can send', () => {
    expect(
      currentObjectiveIndex(['approved', 'pending', 'returned', 'locked'])
    ).toBe(2)
  })

  test('points to the first pending objective when there is nothing to send', () => {
    expect(currentObjectiveIndex(['approved', 'pending', 'pending'])).toBe(1)
  })

  test('is -1 once every objective is approved', () => {
    expect(currentObjectiveIndex(['approved', 'approved'])).toBe(-1)
  })
})
