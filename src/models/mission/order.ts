export const MOVE_DIRECTIONS = ['up', 'down'] as const
export type MoveDirection = (typeof MOVE_DIRECTIONS)[number]

// `undefined` when the id isn't listed; the same order when it's already at that end
export const moveItem = <Id>(
  ids: readonly Id[],
  id: Id,
  direction: MoveDirection
) => {
  const from = ids.indexOf(id)
  if (from === -1) return
  const to = direction === 'up' ? from - 1 : from + 1
  if (to < 0 || to >= ids.length) return [...ids]
  const moved = [...ids]
  moved[from] = ids[to]!
  moved[to] = id
  return moved
}
