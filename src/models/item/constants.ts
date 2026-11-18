import type { AvatarItem, CharacterClass } from '@/models/avatar/layers'

// Imported by the client too, so it must not import anything server-only

// An avatar wears one item per slot, since two hats drawn on the same layer overlap
export const ITEM_SLOTS = ['head', 'face'] as const

export type ItemSlot = (typeof ITEM_SLOTS)[number]

type ItemDefinition = {
  name: string
  slot: ItemSlot
  price: number
  minLevel: number
  characterClass?: CharacterClass
}

// Global, so an item bought in one class keeps its meaning in every other. A new item is imported
// with `pnpm sprites:import` first, which adds it to the manifest
export const ITEM_CATALOG: Record<AvatarItem, ItemDefinition> = {
  bandana: { name: 'Bandana', slot: 'head', price: 20, minLevel: 1 },
  'round-glasses': {
    name: 'Óculos redondos',
    slot: 'face',
    price: 15,
    minLevel: 1
  },
  'wizard-hat': {
    name: 'Chapéu de mago',
    slot: 'head',
    price: 40,
    minLevel: 2,
    characterClass: 'mage'
  },
  crown: { name: 'Coroa', slot: 'head', price: 80, minLevel: 3 }
}

export const ITEM_IDS = Object.keys(ITEM_CATALOG) as AvatarItem[]

export const isItemId = (id: string): id is AvatarItem =>
  Object.hasOwn(ITEM_CATALOG, id)
