import { describe, expect, test } from 'vitest'

import { avatarLayers, type AvatarLook } from './layers'
import { AVATAR_MANIFEST } from './manifest'

const look: AvatarLook = {
  bodyType: 'female',
  skin: 'brown',
  hairStyle: 'ponytail',
  hairColor: 'redhead',
  characterClass: 'mage',
  outfitColor: 'purple',
  items: ['wizard-hat']
}

const fileOf = (path: string) => path.slice(path.lastIndexOf('/') + 1)

describe('avatarLayers', () => {
  test('stacks the layers from back to front', () => {
    const zPositions = avatarLayers(look).map(({ zPos }) => zPos)

    expect(zPositions).toEqual(zPositions.toSorted((a, b) => a - b))
  })

  test('draws the back of the cape behind the body', () => {
    const files = avatarLayers(look).map(({ src }) => fileOf(src))
    const body = files.findIndex((file) => file.startsWith('body-'))

    expect(
      files.slice(0, body).map((file) => file.slice(0, file.indexOf('-')))
    ).toEqual(['shadow', 'outfit'])
  })

  test('draws an item over the hair', () => {
    const files = avatarLayers(look).map(({ src }) => fileOf(src))

    expect(files.at(-1)).toMatch(/^item-wizard-hat-/)
  })

  test('leaves the hair out of a look without one', () => {
    const files = avatarLayers({ ...look, hairStyle: null }).map(({ src }) =>
      fileOf(src)
    )

    expect(files.some((file) => file.startsWith('hair-'))).toBe(false)
  })

  test('finds the layers of every look the manifest offers', () => {
    const { bodyTypes, skins, hairStyles, hairColors, outfitColors, items } =
      AVATAR_MANIFEST

    for (const bodyType of bodyTypes)
      for (const skin of skins)
        for (const hairStyle of hairStyles)
          for (const hairColor of hairColors)
            for (const [characterClass, colors] of Object.entries(outfitColors))
              for (const outfitColor of colors)
                expect(() =>
                  avatarLayers({
                    bodyType,
                    skin,
                    hairStyle,
                    hairColor,
                    characterClass,
                    outfitColor,
                    items
                  } as AvatarLook)
                ).not.toThrow()
  })

  test('rejects a look outside the manifest', () => {
    expect(() =>
      avatarLayers({ ...look, outfitColor: 'gold' } as unknown as AvatarLook)
    ).toThrow('No avatar layers for outfit:mage:female:gold')
  })
})
