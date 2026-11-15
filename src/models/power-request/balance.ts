// A coin penalty takes only what the student has, without respecting the reservations, so the coins
// may end up below what the pending requests hold
export const availableCoins = (coins: number, pending: { cost: number }[]) =>
  Math.max(coins - pending.reduce((total, { cost }) => total + cost, 0), 0)
