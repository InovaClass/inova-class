import { z } from 'zod'

import type { AvatarItem, CharacterClass } from '@/models/avatar/layers'
import {
  characterClassChanged,
  characterNotChosen
} from '@/models/character/errors'
import { classNotFound } from '@/models/class/errors'
import { levelOf } from '@/models/ledger/level'
import { ledgerModel } from '@/models/ledger/model'
import { availableCoins } from '@/models/power-request/balance'
import { itemRepo } from '@/repositories/item-repo'
import { powerRequestRepo } from '@/repositories/power-request-repo'

import { isItemId, ITEM_CATALOG, ITEM_IDS } from './constants'
import { itemAlreadyOwned, itemNotFound, itemNotOwned } from './errors'
import {
  checkEquip,
  checkItemPurchase,
  equipItem,
  fitsCharacterClass,
  unequipItem
} from './rules'

// The ids come from the URL or the client, and Postgres rejects a value that isn't a UUID
const isId = (id: string) => z.uuid().safeParse(id).success

// An import may drop an item from the manifest, and the column keeps whatever was equipped before
const knownItems = (items: string[]) => items.filter(isItemId)

const parseItemId = (itemId: string) => {
  if (!isItemId(itemId)) throw itemNotFound()
  return itemId
}

const requireWearer = async (studentId: string, classId: string) => {
  const enrollment = isId(classId)
    ? await itemRepo.findEnrollment(studentId, classId)
    : undefined
  if (!enrollment) throw classNotFound()
  if (!enrollment.characterClass) throw characterNotChosen()
  return {
    ...enrollment,
    characterClass: enrollment.characterClass as CharacterClass,
    equippedItems: knownItems(enrollment.equippedItems)
  }
}

const purchase = async (studentId: string, classId: string, itemId: string) => {
  const item = parseItemId(itemId)
  const { id: enrollmentId } = await requireWearer(studentId, classId)
  const ownedItemId = crypto.randomUUID()

  await ledgerModel.spendOnItem(
    enrollmentId,
    { ownedItemId, createdById: studentId },
    {
      claim: async (transaction, { coins }) => {
        const [enrollment, pending, owned] = await Promise.all([
          itemRepo.findLockedEnrollment(transaction, enrollmentId),
          powerRequestRepo.pendingOf(transaction, enrollmentId),
          itemRepo.isOwned(transaction, studentId, item)
        ])
        if (!enrollment?.characterClass) throw characterNotChosen()
        checkItemPurchase(item, {
          level: levelOf(enrollment.xp),
          characterClass: enrollment.characterClass as CharacterClass,
          shopEnabled: enrollment.itemShopEnabled,
          owned,
          availableCoins: availableCoins(coins, pending)
        })
        return ITEM_CATALOG[item].price
      },
      confirm: async (transaction, entryId) => {
        const inserted = await itemRepo.insertOwned(transaction, {
          id: ownedItemId,
          studentId,
          itemId: item,
          purchaseEntryId: entryId
        })
        if (!inserted) throw itemAlreadyOwned()
      }
    }
  )
}

const writeEquipped = async (
  studentId: string,
  classId: string,
  characterClass: CharacterClass,
  items: AvatarItem[]
) => {
  const updated = await itemRepo.setEquipped(
    studentId,
    classId,
    characterClass,
    items
  )
  if (!updated) throw characterClassChanged()
}

const equip = async (studentId: string, classId: string, itemId: string) => {
  const item = parseItemId(itemId)
  const { xp, characterClass, equippedItems } = await requireWearer(
    studentId,
    classId
  )
  if (!(await itemRepo.isOwned(undefined, studentId, item))) {
    throw itemNotOwned()
  }
  checkEquip(item, { level: levelOf(xp), characterClass })
  await writeEquipped(
    studentId,
    classId,
    characterClass,
    equipItem(equippedItems, item)
  )
}

const unequip = async (studentId: string, classId: string, itemId: string) => {
  const item = parseItemId(itemId)
  const { characterClass, equippedItems } = await requireWearer(
    studentId,
    classId
  )
  await writeEquipped(
    studentId,
    classId,
    characterClass,
    unequipItem(equippedItems, item)
  )
}

const listForStudent = async (studentId: string, classId: string) => {
  const enrollment = isId(classId)
    ? await itemRepo.findEnrollment(studentId, classId)
    : undefined
  if (!enrollment?.characterClass) return
  const characterClass = enrollment.characterClass as CharacterClass
  const [owned, reservations] = await Promise.all([
    itemRepo.listOwned(studentId),
    powerRequestRepo.findReservations(studentId, classId)
  ])
  if (!reservations) return

  const level = levelOf(enrollment.xp)
  const available = availableCoins(reservations.coins, reservations.pending)
  const equipped = knownItems(enrollment.equippedItems)
  return {
    shopEnabled: enrollment.itemShopEnabled,
    availableCoins: available,
    equippedItems: equipped,
    items: ITEM_IDS.filter(
      (item) => enrollment.itemShopEnabled || owned.includes(item)
    ).map((item) => {
      const { name, slot, price, minLevel } = ITEM_CATALOG[item]
      return {
        id: item,
        name,
        slot,
        price,
        minLevel,
        exclusiveTo: ITEM_CATALOG[item].characterClass ?? null,
        owned: owned.includes(item),
        equipped: equipped.includes(item),
        fitsCharacterClass: fitsCharacterClass(item, characterClass),
        unlocked: level >= minLevel,
        affordable: available >= price
      }
    })
  }
}

export const itemModel = { purchase, equip, unequip, listForStudent }
