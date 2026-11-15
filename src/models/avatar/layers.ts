import { AVATAR_MANIFEST } from './manifest'

type Manifest = typeof AVATAR_MANIFEST

export type BodyType = Manifest['bodyTypes'][number]
export type Skin = Manifest['skins'][number]
export type HairStyle = Manifest['hairStyles'][number]
export type HairColor = Manifest['hairColors'][number]
export type CharacterClass = keyof Manifest['outfitColors']
export type OutfitColor<C extends CharacterClass = CharacterClass> =
  Manifest['outfitColors'][C][number]
export type AvatarItem = Manifest['items'][number]
export type AvatarAnimation = keyof Manifest['animations']

export type AvatarLook = {
  [C in CharacterClass]: {
    bodyType: BodyType
    skin: Skin
    hairStyle: HairStyle | null
    hairColor: HairColor
    characterClass: C
    outfitColor: OutfitColor<C>
    items: readonly AvatarItem[]
  }
}[CharacterClass]

export type AvatarLayer = { src: string; zPos: number }

const MANIFEST_LAYERS: Record<string, readonly AvatarLayer[]> =
  AVATAR_MANIFEST.layers

const layersOf = (key: string) => {
  const layers = MANIFEST_LAYERS[key]
  if (!layers) throw new Error(`No avatar layers for ${key}`)
  return layers
}

export const avatarLayers = ({
  bodyType,
  skin,
  hairStyle,
  hairColor,
  characterClass,
  outfitColor,
  items
}: AvatarLook) =>
  [
    `shadow:${bodyType}`,
    `body:${bodyType}:${skin}`,
    `head:${bodyType}:${skin}`,
    ...(hairStyle ? [`hair:${bodyType}:${hairStyle}:${hairColor}`] : []),
    `outfit:${characterClass}:${bodyType}:${outfitColor}`,
    ...items.map((item) => `item:${item}:${bodyType}`)
  ]
    .flatMap((key) => layersOf(key))
    .toSorted((a, b) => a.zPos - b.zPos)
