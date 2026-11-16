import { notEnoughAvailableCoins } from '@/models/power-request/errors'
import { rewardOutOfStock } from '@/models/reward/errors'

// Takes the coins after the power request reservations, so a purchase never spends what a pending
// request holds (#20)
export const checkPurchase = ({
  availableCoins,
  price,
  stock
}: {
  availableCoins: number
  price: number
  stock: number | null
}) => {
  if (stock === 0) throw rewardOutOfStock()
  if (availableCoins < price) throw notEnoughAvailableCoins()
}
