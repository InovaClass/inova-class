export type BehaviorValues = { xp: number; hp: number; coins: number }

export type BehaviorKind = 'positive' | 'negative'

export const kindOf = ({
  xp,
  hp,
  coins
}: BehaviorValues): BehaviorKind | undefined => {
  const signs = new Set(
    [xp, hp, coins]
      .filter((value) => value !== 0)
      .map((value) => Math.sign(value))
  )
  if (signs.size !== 1) return undefined
  return signs.has(1) ? 'positive' : 'negative'
}
