import { describe, expect, test } from 'vitest'

import { AVATAR_MANIFEST } from '@/models/avatar/manifest'

import { ITEM_IDS } from './constants'
import {
  checkEquip,
  checkItemPurchase,
  equipItem,
  itemsExclusiveToOthers,
  unequipItem
} from './rules'

const MAGE = { level: 2, characterClass: 'mage' } as const
const OPEN_SHOP = { shopEnabled: true, owned: false, availableCoins: 100 }

describe('ITEM_CATALOG', () => {
  test('sells every item of the sprite manifest', () => {
    expect(new Set(ITEM_IDS)).toEqual(new Set(AVATAR_MANIFEST.items))
  })
})

describe('checkEquip', () => {
  test('accepts an exclusive item on its own character class', () => {
    expect(() => checkEquip('wizard-hat', MAGE)).not.toThrow()
  })

  test('rejects an exclusive item on another character class', () => {
    expect(() =>
      checkEquip('wizard-hat', { ...MAGE, characterClass: 'warrior' })
    ).toThrow('Esse item é de outra classe de personagem.')
  })

  test('rejects an item below its minimum level', () => {
    expect(() => checkEquip('wizard-hat', { ...MAGE, level: 1 })).toThrow(
      'Esse item ainda está bloqueado nesta turma.'
    )
  })
})

describe('checkItemPurchase', () => {
  test('accepts a purchase the available coins cover', () => {
    expect(() =>
      checkItemPurchase('wizard-hat', {
        ...MAGE,
        ...OPEN_SHOP,
        availableCoins: 40
      })
    ).not.toThrow()
  })

  test('rejects a purchase above the available coins', () => {
    expect(() =>
      checkItemPurchase('wizard-hat', {
        ...MAGE,
        ...OPEN_SHOP,
        availableCoins: 39
      })
    ).toThrow('Você não tem moedas disponíveis suficientes.')
  })

  test('rejects an item the student already owns', () => {
    expect(() =>
      checkItemPurchase('bandana', { ...MAGE, ...OPEN_SHOP, owned: true })
    ).toThrow('Você já tem esse item.')
  })

  test('rejects any purchase while the shop is disabled', () => {
    expect(() =>
      checkItemPurchase('bandana', {
        ...MAGE,
        ...OPEN_SHOP,
        shopEnabled: false
      })
    ).toThrow('O professor fechou a loja de itens nesta turma.')
  })

  test('rejects an item the student could not wear', () => {
    expect(() => checkItemPurchase('crown', { ...MAGE, ...OPEN_SHOP })).toThrow(
      'Esse item ainda está bloqueado nesta turma.'
    )
  })
})

describe('equipItem', () => {
  test('replaces the item of the same slot', () => {
    expect(equipItem(['round-glasses', 'bandana'], 'crown')).toEqual([
      'round-glasses',
      'crown'
    ])
  })

  test('keeps the items of the other slots', () => {
    expect(equipItem(['bandana'], 'round-glasses')).toEqual([
      'bandana',
      'round-glasses'
    ])
  })

  test('keeps a single copy of an item equipped twice', () => {
    expect(equipItem(['bandana'], 'bandana')).toEqual(['bandana'])
  })
})

describe('unequipItem', () => {
  test('removes only the given item', () => {
    expect(unequipItem(['bandana', 'round-glasses'], 'bandana')).toEqual([
      'round-glasses'
    ])
  })
})

describe('itemsExclusiveToOthers', () => {
  test('lists the items exclusive to another character class', () => {
    expect(itemsExclusiveToOthers('warrior')).toEqual(['wizard-hat'])
  })

  test('lists nothing for the class an item belongs to', () => {
    expect(itemsExclusiveToOthers('mage')).toEqual([])
  })
})
