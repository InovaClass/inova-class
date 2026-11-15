import type {
  BodyType,
  HairColor,
  HairStyle,
  OutfitColor,
  Skin
} from '@/models/avatar/layers'
import { NO_HAIR } from '@/models/character/constants'

// Numbered rather than named by gender or by color, which the preview already shows
export const BODY_TYPE_LABELS = {
  male: 'Corpo 1',
  female: 'Corpo 2'
} satisfies Record<BodyType, string>

export const SKIN_LABELS = {
  light: 'Tom 1',
  amber: 'Tom 2',
  olive: 'Tom 3',
  bronze: 'Tom 4',
  brown: 'Tom 5',
  black: 'Tom 6'
} satisfies Record<Skin, string>

export const HAIR_STYLE_LABELS = {
  [NO_HAIR]: 'Sem cabelo',
  buzzcut: 'Raspado',
  plain: 'Curto',
  messy: 'Bagunçado',
  pixie: 'Pixie',
  'curly-short': 'Cacheado',
  afro: 'Black power',
  bob: 'Chanel',
  ponytail: 'Rabo de cavalo',
  'long-straight': 'Longo'
} satisfies Record<HairStyle | typeof NO_HAIR, string>

export const HAIR_COLOR_LABELS = {
  black: 'Preto',
  dark_brown: 'Castanho-escuro',
  chestnut: 'Castanho',
  blonde: 'Loiro',
  redhead: 'Ruivo',
  gray: 'Grisalho',
  pink: 'Rosa',
  blue: 'Azul'
} satisfies Record<HairColor, string>

export const OUTFIT_COLOR_LABELS = {
  steel: 'Aço',
  iron: 'Ferro',
  bronze: 'Bronze',
  gold: 'Ouro',
  purple: 'Roxo',
  navy: 'Azul-marinho',
  maroon: 'Vinho',
  forest: 'Verde',
  white: 'Branco',
  sky: 'Azul-claro',
  lavender: 'Lavanda',
  yellow: 'Amarelo'
} satisfies Record<OutfitColor, string>
