import type { AvatarItem, CharacterClass } from '@/models/avatar/layers'
import { notEnoughAvailableCoins } from '@/models/power-request/errors'

import { ITEM_CATALOG, ITEM_IDS } from './constants'
import {
  itemAlreadyOwned,
  itemLocked,
  itemOfAnotherCharacterClass,
  itemShopDisabled
} from './errors'

type Wearer = { level: number; characterClass: CharacterClass }

export const fitsCharacterClass = (
  item: AvatarItem,
  characterClass: CharacterClass
) => {
  const exclusiveTo = ITEM_CATALOG[item].characterClass
  return !exclusiveTo || exclusiveTo === characterClass
}

// The level is the one of the class where the item is used, so an item bought in one class may stay
// locked in another
export const checkEquip = (
  item: AvatarItem,
  { level, characterClass }: Wearer
) => {
  if (!fitsCharacterClass(item, characterClass)) {
    throw itemOfAnotherCharacterClass()
  }
  if (level < ITEM_CATALOG[item].minLevel) throw itemLocked()
}

// Takes the coins after the power request reservations, as a reward purchase does (#20)
export const checkItemPurchase = (
  item: AvatarItem,
  {
    shopEnabled,
    owned,
    availableCoins,
    ...wearer
  }: Wearer & { shopEnabled: boolean; owned: boolean; availableCoins: number }
) => {
  if (!shopEnabled) throw itemShopDisabled()
  if (owned) throw itemAlreadyOwned()
  checkEquip(item, wearer)
  if (availableCoins < ITEM_CATALOG[item].price) {
    throw notEnoughAvailableCoins()
  }
}

export const equipItem = (
  equipped: readonly AvatarItem[],
  item: AvatarItem
) => [
  ...equipped.filter(
    (current) => ITEM_CATALOG[current].slot !== ITEM_CATALOG[item].slot
  ),
  item
]

export const unequipItem = (
  equipped: readonly AvatarItem[],
  item: AvatarItem
) => equipped.filter((current) => current !== item)

// The items exclusive to another class leave when the teacher changes the character class
export const itemsExclusiveToOthers = (characterClass: CharacterClass) =>
  ITEM_IDS.filter((item) => !fitsCharacterClass(item, characterClass))
