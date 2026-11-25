export type MapPoint = readonly [number, number]

const segmentsOf = (path: readonly MapPoint[]) =>
  path.slice(1).map((to, index) => {
    const from = path[index]!
    return { from, to, length: Math.hypot(to[0] - from[0], to[1] - from[1]) }
  })

export const pathLength = (path: readonly MapPoint[]) =>
  segmentsOf(path).reduce((total, { length }) => total + length, 0)

const interpolate = (from: MapPoint, to: MapPoint, t: number): MapPoint => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t
]

// The rest of the path from `distance`, measured along it
export const pathFrom = (
  path: readonly MapPoint[],
  distance: number
): MapPoint[] => {
  let left = Math.max(0, distance)
  const segments = segmentsOf(path)
  for (const [index, { from, to, length }] of segments.entries()) {
    if (left < length || (left === length && index === segments.length - 1)) {
      const start = length === 0 ? from : interpolate(from, to, left / length)
      return [start, ...path.slice(index + 1)]
    }
    left -= length
  }
  return path.length > 0 ? [path.at(-1)!] : []
}

// Spread by the length of the path, not by its corners, so any number of objectives fits a map
export const pointsAlong = (path: readonly MapPoint[], count: number) => {
  const length = pathLength(path)
  return Array.from(
    { length: count },
    (_, index) =>
      pathFrom(path, count === 1 ? 0 : (length * index) / (count - 1))[0]!
  )
}
