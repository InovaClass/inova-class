import { describe, expect, test } from 'vitest'

import type { AvatarLook } from '@/models/avatar/layers'

import { appearanceOf, isOutfitColorOf, lookFrom, lookOf } from './look'

const BALD_HEALER: AvatarLook = {
  characterClass: 'healer',
  bodyType: 'male',
  skin: 'brown',
  hairStyle: null,
  hairColor: 'black',
  outfitColor: 'sky',
  items: []
}

describe('lookOf', () => {
  test('is null before the character is chosen', () => {
    expect(
      lookOf({
        characterClass: null,
        bodyType: null,
        skin: null,
        hairStyle: null,
        hairColor: null,
        outfitColor: null,
        equippedItems: []
      })
    ).toBeNull()
  })

  test('takes the equipped items as the items of the look', () => {
    expect(lookOf({ ...BALD_HEALER, equippedItems: ['crown'] })).toEqual({
      ...BALD_HEALER,
      items: ['crown']
    })
  })
})

describe('appearanceOf and lookFrom', () => {
  test('a character without hair goes through the form and back', () => {
    const appearance = appearanceOf(BALD_HEALER)

    expect(appearance.hairStyle).toBe('none')
    expect(lookFrom('healer', appearance)).toEqual(BALD_HEALER)
  })
})

describe('isOutfitColorOf', () => {
  test('accepts only the colors of the character class', () => {
    expect(isOutfitColorOf('warrior', 'gold')).toBe(true)
    expect(isOutfitColorOf('mage', 'gold')).toBe(false)
  })
})
