export const ROULETTE_STEPS = 16

// The server already drew the result, so the roulette only shows the names going by and stops on it
export const rouletteNames = (
  names: readonly string[],
  result: string,
  start: number
) => {
  const others = names.filter((name) => name !== result)
  const pool = others.length > 0 ? others : [result]
  return [
    ...Array.from(
      { length: ROULETTE_STEPS - 1 },
      (_, index) => pool[(start + index) % pool.length]
    ),
    result
  ]
}

export const rouletteDelayAt = (step: number) => 60 + step * step * 2
