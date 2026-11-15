import { z } from 'zod'

import type { CharacterClass, OutfitColor } from '@/models/avatar/layers'
import { AVATAR_MANIFEST } from '@/models/avatar/manifest'

import { NO_HAIR } from './constants'
import { CHARACTER_CLASSES, isOutfitColorOf } from './look'

// Imported by the client forms too, so it must not import anything server-only

const { bodyTypes, skins, hairStyles, hairColors, outfitColors } =
  AVATAR_MANIFEST

const characterClassField = z.enum(
  CHARACTER_CLASSES as [CharacterClass, ...CharacterClass[]],
  'Escolha uma classe.'
)

const appearanceShape = {
  bodyType: z.enum(bodyTypes, 'Escolha um corpo.'),
  skin: z.enum(skins, 'Escolha um tom de pele.'),
  hairStyle: z
    .enum([...hairStyles, NO_HAIR], 'Escolha um cabelo.')
    .transform((hairStyle) => (hairStyle === NO_HAIR ? null : hairStyle)),
  hairColor: z.enum(hairColors, 'Escolha uma cor de cabelo.'),
  outfitColor: z.enum(
    Object.values(outfitColors).flat() as [OutfitColor, ...OutfitColor[]],
    'Escolha uma cor de roupa.'
  )
}

export const OUTFIT_COLOR_OF_ANOTHER_CHARACTER_CLASS =
  'Escolha uma cor da classe do personagem.'

export const characterSchema = z
  .object({ characterClass: characterClassField, ...appearanceShape })
  .refine(
    ({ characterClass, outfitColor }) =>
      isOutfitColorOf(characterClass, outfitColor),
    { path: ['outfitColor'], message: OUTFIT_COLOR_OF_ANOTHER_CHARACTER_CLASS }
  )
export type CharacterInput = z.input<typeof characterSchema>

// The character class stays out: only the teacher changes it once it's chosen
export const appearanceSchema = z.object(appearanceShape)
export type AppearanceInput = z.input<typeof appearanceSchema>

export const characterClassSchema = z.object({
  characterClass: characterClassField
})
export type CharacterClassInput = z.input<typeof characterClassSchema>
