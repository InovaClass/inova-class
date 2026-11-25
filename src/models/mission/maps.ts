import { DEFAULT_MISSION_MAP } from '@/constants/game'

import { MAP_MANIFEST } from './map-manifest'

export type MissionMapId = keyof typeof MAP_MANIFEST.maps

export const MISSION_MAP_NAMES: Record<MissionMapId, string> = {
  forest: 'Floresta',
  desert: 'Deserto',
  snow: 'Neve'
}

export const MISSION_MAP_IDS = Object.keys(MISSION_MAP_NAMES) as [
  MissionMapId,
  ...MissionMapId[]
]

export const DEFAULT_MAP: MissionMapId =
  DEFAULT_MISSION_MAP satisfies MissionMapId

// A map dropped from the catalog by an import falls back to the default, as an item dropped from
// the avatar manifest is ignored
export const mapIdOf = (id: string): MissionMapId =>
  Object.hasOwn(MAP_MANIFEST.maps, id) ? (id as MissionMapId) : DEFAULT_MAP
