import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'

import { PNG } from 'pngjs'
import * as prettier from 'prettier'

const REPOSITORY = 'LiberatedPixelCup/RPG_Maker_MZ_LPC_Starter_Kit'
const COMMIT = 'c4b2dafe697b6fc7f53aa35d8727afe7542d6e2a'
// The tilesets are stored with Git LFS, so raw.githubusercontent.com only serves their pointers
const MEDIA_URL = `https://media.githubusercontent.com/media/${REPOSITORY}/${COMMIT}`
const TILESET_DIR = 'LPC/img/tilesets/LPC'
const ATTRIBUTION_URL = `https://github.com/${REPOSITORY}/blob/${COMMIT}/${TILESET_DIR}/Final%20Attributions/Final%20Attribution.txt`

// Same reason as in import-lpc-sprites.ts
setDefaultAutoSelectFamilyAttemptTimeout(3000)

const OUTPUT_DIR = 'public/sprites/maps'
const PUBLIC_PATH = '/sprites/maps'
const MANIFEST_FILE = 'src/models/mission/map-manifest.ts'

const TILE = 32
const COLUMNS = 20
const ROWS = 12

const TERRAIN_TILESET = 'Terrain and Outside.png'
const OBJECTS_TILESET = 'Outside Objects.png'

// The attribution file of the starter kit gives no license for some authors, so those take the
// license of the whole tileset, stated at the top of that file
const TILESET_LICENSES = ['CC-BY-SA 3.0', 'GPL 3.0']
const SHARM_LICENSES = ['CC-BY 3.0', 'GPL 3.0', 'GPL 2.0', 'OGA-BY 3.0']
const LPC_BASE_ASSETS_URL =
  'https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles'

const CREDITS = {
  grass: {
    name: 'Grass',
    file: TERRAIN_TILESET,
    authors: ['Lanea Zimmerman (Sharm)'],
    licenses: SHARM_LICENSES,
    urls: [LPC_BASE_ASSETS_URL, ATTRIBUTION_URL]
  },
  flowers: {
    name: 'Grass with flowers',
    file: TERRAIN_TILESET,
    authors: ['Casper Nilsson'],
    licenses: TILESET_LICENSES,
    urls: [ATTRIBUTION_URL]
  },
  dirt: {
    name: 'Dirt',
    file: TERRAIN_TILESET,
    authors: ['Lanea Zimmerman (Sharm)'],
    licenses: SHARM_LICENSES,
    urls: [LPC_BASE_ASSETS_URL, ATTRIBUTION_URL]
  },
  sand: {
    name: 'Sand',
    file: TERRAIN_TILESET,
    authors: ['Daniel Eddeland', 'William Thompsonj'],
    licenses: TILESET_LICENSES,
    urls: [
      'https://opengameart.org/content/lpc-farming-tilesets-magic-animations-and-ui-elements',
      'https://opengameart.org/content/lpc-sandrock-alt-colors',
      ATTRIBUTION_URL
    ]
  },
  snow: {
    name: 'Snow',
    file: TERRAIN_TILESET,
    authors: ['Nushio'],
    licenses: TILESET_LICENSES,
    urls: [ATTRIBUTION_URL]
  },
  water: {
    name: 'Water',
    file: TERRAIN_TILESET,
    authors: ['Lanea Zimmerman (Sharm)'],
    licenses: SHARM_LICENSES,
    urls: [LPC_BASE_ASSETS_URL, ATTRIBUTION_URL]
  },
  trees: {
    name: 'Trees',
    file: OBJECTS_TILESET,
    authors: ['Lanea Zimmerman (Sharm)'],
    licenses: SHARM_LICENSES,
    urls: [LPC_BASE_ASSETS_URL, ATTRIBUTION_URL]
  },
  leaflessTree: {
    name: 'Leafless tree',
    file: OBJECTS_TILESET,
    authors: ['Barbara Rivera', 'C Phillips'],
    licenses: TILESET_LICENSES,
    urls: [ATTRIBUTION_URL]
  }
} satisfies Record<string, Credit>

type CreditKey = keyof typeof CREDITS

type Credit = {
  name: string
  file: string
  authors: string[]
  licenses: string[]
  urls: string[]
}

// A terrain in the usual LPC layout: three columns and six rows of tiles from `origin`, with the
// fill tiles in the last row
type Terrain = {
  origin: readonly [number, number]
  fills: readonly (readonly [number, number])[]
  credit: CreditKey
}

const fillRow = (column: number, row: number) =>
  [0, 1, 2].map((offset) => [column + offset, row] as const)

const TERRAINS = {
  grass: { origin: [0, 6], fills: fillRow(0, 11), credit: 'grass' },
  flowers: { origin: [3, 6], fills: fillRow(3, 11), credit: 'flowers' },
  lightDirt: { origin: [0, 0], fills: fillRow(0, 5), credit: 'dirt' },
  midDirt: { origin: [3, 0], fills: fillRow(3, 5), credit: 'dirt' },
  sand: { origin: [18, 6], fills: fillRow(18, 11), credit: 'sand' },
  snow: { origin: [18, 12], fills: fillRow(18, 17), credit: 'snow' },
  water: { origin: [15, 12], fills: fillRow(15, 17), credit: 'water' }
} satisfies Record<string, Terrain>

type TerrainKey = keyof typeof TERRAINS

// Parts drawn in order, the first one at the back
type Sprite = {
  width: number
  height: number
  parts: {
    x: number
    y: number
    width: number
    height: number
    at: [number, number]
  }[]
  credit: CreditKey
}

const tree = (top: readonly [number, number]): Sprite => ({
  width: 96,
  height: 128,
  parts: [
    { x: 0, y: 448, width: 96, height: 80, at: [0, 48] },
    { x: top[0], y: top[1], width: 96, height: 96, at: [0, 0] }
  ],
  credit: 'trees'
})

const SPRITES = {
  oak: tree([192, 0]),
  pine: tree([192, 96]),
  snowyPine: tree([0, 320]),
  snowyOak: tree([0, 224]),
  leaflessTree: {
    width: 96,
    height: 96,
    parts: [{ x: 384, y: 256, width: 96, height: 96, at: [0, 0] }],
    credit: 'leaflessTree'
  }
} satisfies Record<string, Sprite>

type Point = readonly [number, number]

type MapDefinition = {
  seed: number
  base: TerrainKey
  // Swapped in for some base tiles, to break the repetition
  accent?: { terrain: TerrainKey; chance: number }
  path: { terrain: TerrainKey; points: Point[] }
  ponds: { terrain: TerrainKey; center: Point; radii: Point }[]
  // Placed by the middle of their bottom edge
  decorations: { sprite: keyof typeof SPRITES; at: Point }[]
}

const MAPS = {
  forest: {
    seed: 97_001,
    base: 'grass',
    accent: { terrain: 'flowers', chance: 0.08 },
    path: {
      terrain: 'lightDirt',
      points: [
        [48, 320],
        [176, 320],
        [224, 208],
        [336, 176],
        [400, 288],
        [528, 288],
        [592, 112]
      ]
    },
    ponds: [{ terrain: 'water', center: [80, 128], radii: [64, 48] }],
    decorations: [
      { sprite: 'oak', at: [296, 128] },
      { sprite: 'pine', at: [448, 160] },
      { sprite: 'oak', at: [320, 384] },
      { sprite: 'pine', at: [192, 136] },
      { sprite: 'oak', at: [608, 384] }
    ]
  },
  desert: {
    seed: 97_002,
    base: 'sand',
    path: {
      terrain: 'midDirt',
      points: [
        [48, 96],
        [208, 96],
        [272, 256],
        [432, 304],
        [512, 160],
        [592, 160]
      ]
    },
    ponds: [{ terrain: 'water', center: [480, 72], radii: [80, 48] }],
    decorations: [
      { sprite: 'leaflessTree', at: [96, 320] },
      { sprite: 'leaflessTree', at: [384, 176] },
      { sprite: 'leaflessTree', at: [592, 368] }
    ]
  },
  snow: {
    seed: 97_003,
    base: 'snow',
    path: {
      terrain: 'lightDirt',
      points: [
        [48, 192],
        [160, 128],
        [288, 192],
        [352, 320],
        [496, 320],
        [592, 192]
      ]
    },
    ponds: [{ terrain: 'water', center: [480, 96], radii: [64, 40] }],
    decorations: [
      { sprite: 'snowyPine', at: [96, 384] },
      { sprite: 'snowyOak', at: [200, 372] },
      { sprite: 'snowyPine', at: [320, 96] },
      { sprite: 'snowyPine', at: [608, 400] }
    ]
  }
} satisfies Record<string, MapDefinition>

const PATH_RADIUS = 24

const downloads = new Map<string, Promise<PNG>>()

const loadTileset = (file: string) => {
  const cached = downloads.get(file)
  if (cached) return cached
  const request = (async () => {
    const url = `${MEDIA_URL}/${TILESET_DIR}/${encodeURIComponent(file)}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`${response.status} for ${file}`)
    return PNG.sync.read(Buffer.from(await response.arrayBuffer()))
  })()
  downloads.set(file, request)
  return request
}

// MINSTD, so every run draws the same tiles and the file hash stays the same
const randomFrom = (seed: number) => {
  let state = seed
  return () => {
    state = (state * 48_271) % 2_147_483_647
    return state / 2_147_483_647
  }
}

const pick = <T>(items: readonly T[], random: () => number) =>
  items[Math.floor(random() * items.length)] as T

const forEachCell = (
  width: number,
  height: number,
  callback: (x: number, y: number) => void
) => {
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) callback(x, y)
}

// Alpha compositing, since the overlays and the sprites have soft edges
const draw = (
  source: PNG,
  target: PNG,
  sx: number,
  sy: number,
  width: number,
  height: number,
  dx: number,
  dy: number
) =>
  forEachCell(width, height, (x, y) => {
    const tx = dx + x
    const ty = dy + y
    if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height) return
    const from = ((sy + y) * source.width + sx + x) * 4
    const to = (ty * target.width + tx) * 4
    const alpha = (source.data[from + 3] ?? 0) / 255
    if (alpha === 0) return
    for (let channel = 0; channel < 3; channel++)
      target.data[to + channel] = Math.round(
        (source.data[from + channel] ?? 0) * alpha +
          (target.data[to + channel] ?? 0) * (1 - alpha)
      )
    target.data[to + 3] = 255
  })

const drawTile = (
  tileset: PNG,
  target: PNG,
  [column, row]: readonly [number, number],
  x: number,
  y: number
) =>
  draw(
    tileset,
    target,
    column * TILE,
    row * TILE,
    TILE,
    TILE,
    x * TILE,
    y * TILE
  )

type Corners = boolean[][]

const emptyCorners = (): Corners =>
  Array.from({ length: ROWS + 1 }, () =>
    Array.from({ length: COLUMNS + 1 }, () => false)
  )

const distanceToSegment = (point: Point, from: Point, to: Point) => {
  const [px, py] = point
  const [ax, ay] = from
  const [bx, by] = to
  const length = (bx - ax) ** 2 + (by - ay) ** 2
  const t =
    length === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / length)
        )
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)))
}

const markCorners = (corners: Corners, inside: (point: Point) => boolean) => {
  for (const [row, line] of corners.entries())
    for (const column of line.keys())
      if (inside([column * TILE, row * TILE])) line[column] = true
}

const cornerAt = (corners: Corners, column: number, row: number) =>
  corners[row]?.[column] ?? false

const maskAt = (corners: Corners, column: number, row: number) =>
  (cornerAt(corners, column, row) ? 8 : 0) |
  (cornerAt(corners, column + 1, row) ? 4 : 0) |
  (cornerAt(corners, column, row + 1) ? 2 : 0) |
  (cornerAt(corners, column + 1, row + 1) ? 1 : 0)

// The LPC layout has no tile for two opposite corners, so one more corner joins them
const joinDiagonals = (corners: Corners) => {
  let changed = true
  while (changed) {
    changed = false
    forEachCell(COLUMNS, ROWS, (column, row) => {
      const mask = maskAt(corners, column, row)
      const line = corners[row]
      if (!line || (mask !== 0b1001 && mask !== 0b0110)) return
      line[mask === 0b1001 ? column + 1 : column] = true
      changed = true
    })
  }
}

// Offsets inside the terrain's block, by the corners covered (top left, top right, bottom left,
// bottom right, from the highest bit)
const EDGE_TILES: Record<number, readonly [number, number]> = {
  0b0001: [0, 2],
  0b0011: [1, 2],
  0b0010: [2, 2],
  0b0101: [0, 3],
  0b1010: [2, 3],
  0b0100: [0, 4],
  0b1100: [1, 4],
  0b1000: [2, 4],
  0b1110: [1, 0],
  0b1101: [2, 0],
  0b1011: [1, 1],
  0b0111: [2, 1]
}

const drawTerrain = (
  tileset: PNG,
  target: PNG,
  terrain: Terrain,
  corners: Corners,
  random: () => number
) =>
  forEachCell(COLUMNS, ROWS, (column, row) => {
    const mask = maskAt(corners, column, row)
    if (mask === 0) return
    if (mask === 0b1111) {
      drawTile(tileset, target, pick(terrain.fills, random), column, row)
      return
    }
    const offset = EDGE_TILES[mask]
    if (!offset) throw new Error(`No tile for corners ${mask.toString(2)}`)
    drawTile(
      tileset,
      target,
      [terrain.origin[0] + offset[0], terrain.origin[1] + offset[1]],
      column,
      row
    )
  })

const usedCredits = new Set<CreditKey>()

const buildMap = async (definition: MapDefinition) => {
  const [terrainTileset, objectsTileset] = await Promise.all([
    loadTileset(TERRAIN_TILESET),
    loadTileset(OBJECTS_TILESET)
  ])
  const random = randomFrom(definition.seed)
  const map = new PNG({ width: COLUMNS * TILE, height: ROWS * TILE })

  const base = TERRAINS[definition.base]
  usedCredits.add(base.credit)
  forEachCell(COLUMNS, ROWS, (column, row) => {
    const accent = definition.accent
    const terrain =
      accent && random() < accent.chance ? TERRAINS[accent.terrain] : base
    if (terrain !== base) usedCredits.add(terrain.credit)
    drawTile(terrainTileset, map, pick(terrain.fills, random), column, row)
  })

  for (const pond of definition.ponds) {
    const corners = emptyCorners()
    const [cx, cy] = pond.center
    const [rx, ry] = pond.radii
    markCorners(
      corners,
      ([x, y]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
    )
    joinDiagonals(corners)
    const terrain = TERRAINS[pond.terrain]
    usedCredits.add(terrain.credit)
    drawTerrain(terrainTileset, map, terrain, corners, random)
  }

  const { points } = definition.path
  const pathCorners = emptyCorners()
  markCorners(pathCorners, (corner) =>
    points
      .slice(1)
      .some(
        (to, index) =>
          distanceToSegment(corner, points[index] as Point, to) <= PATH_RADIUS
      )
  )
  joinDiagonals(pathCorners)
  const pathTerrain = TERRAINS[definition.path.terrain]
  usedCredits.add(pathTerrain.credit)
  drawTerrain(terrainTileset, map, pathTerrain, pathCorners, random)

  const decorations = definition.decorations.toSorted(
    (a, b) => a.at[1] - b.at[1]
  )
  for (const { sprite: key, at } of decorations) {
    const sprite: Sprite = SPRITES[key]
    usedCredits.add(sprite.credit)
    const left = at[0] - sprite.width / 2
    const top = at[1] - sprite.height
    for (const part of sprite.parts)
      draw(
        objectsTileset,
        map,
        part.x,
        part.y,
        part.width,
        part.height,
        left + part.at[0],
        top + part.at[1]
      )
  }

  return PNG.sync.write(map)
}

const files = new Map<string, Buffer>()
const manifestMaps: Record<string, { src: string; path: Point[] }> = {}

for (const [id, definition] of Object.entries(MAPS)) {
  const content = await buildMap(definition)
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 8)
  const name = `${id}.${hash}.png`
  files.set(name, content)
  manifestMaps[id] = {
    src: `${PUBLIC_PATH}/${name}`,
    path: definition.path.points
  }
  process.stdout.write(`${name}\n`)
}

await rm(OUTPUT_DIR, { recursive: true, force: true })
await mkdir(OUTPUT_DIR, { recursive: true })
await Promise.all(
  [...files].map(([name, content]) =>
    writeFile(`${OUTPUT_DIR}/${name}`, content)
  )
)

const manifest = {
  upstream: { repository: `https://github.com/${REPOSITORY}`, commit: COMMIT },
  width: COLUMNS * TILE,
  height: ROWS * TILE,
  maps: manifestMaps,
  credits: Object.entries(CREDITS)
    .filter(([key]) => usedCredits.has(key as CreditKey))
    .map(([, credit]) => credit)
}

const source = `// Generated by \`pnpm sprites:import\` (src/infra/scripts/import-lpc-maps.ts): don't edit
export const MAP_MANIFEST = ${JSON.stringify(manifest)} as const
`
const options = await prettier.resolveConfig(MANIFEST_FILE)
await writeFile(
  MANIFEST_FILE,
  await prettier.format(source, { ...options, filepath: MANIFEST_FILE })
)
