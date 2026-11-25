import { describe, expect, test } from 'vitest'

import { type MapPoint, pathFrom, pointsAlong } from './map-path'

const L_PATH: MapPoint[] = [
  [0, 0],
  [30, 0],
  [30, 10]
]

describe('pointsAlong', () => {
  test('spreads the points evenly by length, from the first end to the last', () => {
    expect(pointsAlong(L_PATH, 5)).toEqual([
      [0, 0],
      [10, 0],
      [20, 0],
      [30, 0],
      [30, 10]
    ])
  })

  test('puts a single point at the start', () => {
    expect(pointsAlong(L_PATH, 1)).toEqual([[0, 0]])
  })

  test('gives no point for no objective', () => {
    expect(pointsAlong(L_PATH, 0)).toEqual([])
  })
})

describe('pathFrom', () => {
  test('keeps the corners after the cut', () => {
    expect(pathFrom(L_PATH, 15)).toEqual([
      [15, 0],
      [30, 0],
      [30, 10]
    ])
  })

  test('ends at the last point past the length of the path', () => {
    expect(pathFrom(L_PATH, 100)).toEqual([[30, 10]])
  })
})
