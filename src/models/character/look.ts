import type {
  AvatarItem,
  AvatarLook,
  BodyType,
  CharacterClass,
  HairColor,
  HairStyle,
  OutfitColor,
  Skin
} from '@/models/avatar/layers'
import { AVATAR_MANIFEST } from '@/models/avatar/manifest'

import { NO_HAIR } from './constants'

// Imported by the client forms too, so it must not import anything server-only

export const CHARACTER_CLASSES = Object.keys(
  AVATAR_MANIFEST.outfitColors
) as CharacterClass[]

export const outfitColorsOf = (characterClass: CharacterClass) =>
  AVATAR_MANIFEST.outfitColors[characterClass] as readonly OutfitColor[]

export const isOutfitColorOf = (
  characterClass: CharacterClass,
  outfitColor: string
) => (outfitColorsOf(characterClass) as readonly string[]).includes(outfitColor)

export type AppearanceValues = {
  bodyType: BodyType
  skin: Skin
  hairStyle: HairStyle | typeof NO_HAIR
  hairColor: HairColor
  outfitColor: OutfitColor
}

type CharacterColumns = {
  characterClass: string | null
  bodyType: string | null
  skin: string | null
  hairStyle: string | null
  hairColor: string | null
  outfitColor: string | null
  equippedItems: string[]
}

// Only `characterModel` writes these columns, after validating them against the manifest
export const lookOf = (columns: CharacterColumns) =>
  columns.characterClass
    ? ({
        characterClass: columns.characterClass,
        bodyType: columns.bodyType,
        skin: columns.skin,
        hairStyle: columns.hairStyle,
        hairColor: columns.hairColor,
        outfitColor: columns.outfitColor,
        items: columns.equippedItems
      } as AvatarLook)
    : null

export const lookFrom = (
  characterClass: CharacterClass,
  { hairStyle, ...appearance }: AppearanceValues,
  items: readonly AvatarItem[] = []
) =>
  ({
    ...appearance,
    characterClass,
    hairStyle: hairStyle === NO_HAIR ? null : hairStyle,
    items
  }) as AvatarLook

export const appearanceOf = ({
  bodyType,
  skin,
  hairStyle,
  hairColor,
  outfitColor
}: AvatarLook): AppearanceValues => ({
  bodyType,
  skin,
  hairStyle: hairStyle ?? NO_HAIR,
  hairColor,
  outfitColor
})
