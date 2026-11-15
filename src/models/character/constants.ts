import type { CharacterClass } from '@/models/avatar/layers'

export const CHARACTER_CLASS_NAMES = {
  warrior: 'Guerreiro',
  mage: 'Mago',
  healer: 'Curandeiro'
} as const satisfies Record<CharacterClass, string>

// A radio value can't be null, so the form sends this for a character without hair
export const NO_HAIR = 'none' as const
