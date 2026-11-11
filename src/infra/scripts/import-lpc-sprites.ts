import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'

import { PNG } from 'pngjs'
import * as prettier from 'prettier'

const REPOSITORY =
  'LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator'
const COMMIT = '86160e7507d6841259cff624a51a63c1d4847ee3'
const RAW_URL = `https://raw.githubusercontent.com/${REPOSITORY}/${COMMIT}`

// Node's default of 250 ms per address gives up on IPv4 before the handshake on slower networks
// (WSL among them) when IPv6 is unreachable
setDefaultAutoSelectFamilyAttemptTimeout(3000)

const OUTPUT_DIR = 'public/sprites/lpc'
const PUBLIC_PATH = '/sprites/lpc'
const MANIFEST_FILE = 'src/models/avatar/manifest.ts'

const FRAME_SIZE = 64
const SOUTH_ROW = 2
// The generator's own matching (sources/canvas/palette-recolor.ts upstream)
const COLOR_TOLERANCE = 1

// Cycles from ANIMATION_CONFIGS in sources/state/constants.ts upstream, baked into the sheet so
// every animation plays at the same frame rate with plain CSS steps()
const ANIMATIONS = [
  { id: 'idle', file: 'idle', cycle: [0, 0, 1], directional: true },
  { id: 'attack', file: 'slash', cycle: [0, 1, 2, 3, 4, 5], directional: true },
  {
    id: 'cast',
    file: 'spellcast',
    cycle: [0, 1, 2, 3, 4, 5, 6],
    directional: true
  },
  { id: 'hurt', file: 'hurt', cycle: [0, 1, 2, 3, 4, 5], directional: false }
] as const
const COLUMNS = Math.max(...ANIMATIONS.map(({ cycle }) => cycle.length))

const BODY_TYPES = ['male', 'female'] as const
const SKINS = ['light', 'amber', 'olive', 'bronze', 'brown', 'black'] as const
const EYE_COLOR = 'brown'
const HAIR_COLORS = [
  'black',
  'dark_brown',
  'chestnut',
  'blonde',
  'redhead',
  'gray',
  'pink',
  'blue'
] as const

const HEADS = {
  male: 'head/heads/human/heads_human_male',
  female: 'head/heads/human/heads_human_female'
} satisfies Record<BodyType, string>

const HAIR_STYLES = {
  buzzcut: 'hair/bald/hair_buzzcut',
  plain: 'hair/short/hair_plain',
  messy: 'hair/short/hair_messy1',
  pixie: 'hair/short/hair_pixie',
  'curly-short': 'hair/curly/hair_curly_short',
  afro: 'hair/afro/hair_afro',
  bob: 'hair/bob/hair_bob',
  ponytail: 'hair/braids/hair_ponytail',
  'long-straight': 'hair/long/hair_long_straight'
}

// `OUTFIT_COLOR` takes the color the student picks; any other value is fixed for the class
const OUTFIT_COLOR = Symbol('outfit color')

const OUTFITS = {
  warrior: {
    colors: ['steel', 'iron', 'bronze', 'gold'],
    pieces: [
      // The plate leaves the arms bare
      {
        definition: 'torso/shirts/longsleeve/torso_clothes_longsleeve',
        color: 'charcoal'
      },
      { definition: 'torso/armour/torso_armour_plate', color: OUTFIT_COLOR },
      { definition: 'legs/legs_armour', color: OUTFIT_COLOR },
      { definition: 'feet/feet_armour', color: OUTFIT_COLOR }
    ]
  },
  mage: {
    colors: ['purple', 'navy', 'maroon', 'forest'],
    pieces: [
      {
        definition: 'torso/shirts/longsleeve/torso_clothes_longsleeve',
        color: OUTFIT_COLOR
      },
      { definition: 'torso/cape/cape_solid', color: OUTFIT_COLOR },
      { definition: 'legs/pants/legs_pants', color: 'charcoal' },
      { definition: 'feet/shoes/feet_shoes_basic', color: 'brown' }
    ]
  },
  healer: {
    colors: ['white', 'sky', 'lavender', 'yellow'],
    pieces: [
      {
        definition: 'torso/shirts/longsleeve/torso_clothes_longsleeve2_vneck',
        color: OUTFIT_COLOR
      },
      { definition: 'torso/waist/obi/belt_obi', variant: 'forest' },
      { definition: 'legs/pants/legs_pants', color: 'tan' },
      { definition: 'feet/feet_sandals', color: 'leather' }
    ]
  }
} satisfies Record<string, { colors: string[]; pieces: Piece[] }>

const ITEMS = {
  'wizard-hat': {
    definition: 'headwear/hats/magic/hat_magic_wizard',
    variant: 'purple'
  },
  crown: {
    definition: 'headwear/hats/formal/hat_formal_crown',
    variant: 'crown_gold'
  },
  bandana: {
    definition: 'headwear/coverings/bandana/hat_bandana',
    color: 'red'
  },
  'round-glasses': {
    definition: 'headwear/accessories/glasses/facial_glasses_round',
    variant: 'black'
  }
} satisfies Record<string, Piece>

type BodyType = (typeof BODY_TYPES)[number]

type Piece = {
  definition: string
  // Target palette of a recolored definition: a name for its main color, or one per color slot
  color?: string | typeof OUTFIT_COLOR | Record<string, string>
  // Pre-rendered file of a definition without palettes
  variant?: string
}

type Recolor = {
  material: string
  base?: string | null
  source?: string[]
}

type Layer = Partial<Record<BodyType, string>> & { zPos: number }

type Definition = {
  name: string
  variants?: string[]
  recolors?: Recolor | Record<`color_${number}`, Recolor>
  credits: Credit[]
} & Partial<Record<`layer_${number}`, Layer>>

type Credit = {
  file: string
  notes?: string
  authors: string[]
  licenses: string[]
  urls: string[]
}

type Rgb = readonly [number, number, number]

const downloads = new Map<string, Promise<Buffer>>()

const download = (path: string) => {
  const cached = downloads.get(path)
  if (cached) return cached
  const request = (async () => {
    const response = await fetch(`${RAW_URL}/${path}`)
    if (!response.ok) throw new Error(`${response.status} for ${path}`)
    return Buffer.from(await response.arrayBuffer())
  })()
  downloads.set(path, request)
  return request
}

const downloadJson = async <T>(path: string) => {
  const content = await download(path)
  return JSON.parse(content.toString('utf8')) as T
}

const definitions = new Map<string, Definition>()

const loadDefinition = async (name: string) => {
  const definition =
    definitions.get(name) ??
    (await downloadJson<Definition>(`sheet_definitions/${name}.json`))
  definitions.set(name, definition)
  return definition
}

const paletteOf = async (material: string) => {
  const [meta, palettes] = await Promise.all([
    downloadJson<{ base: string }>(
      `palette_definitions/${material}/meta_${material}.json`
    ),
    downloadJson<Record<string, string[]>>(
      `palette_definitions/${material}/${material}_ulpc.json`
    )
  ])
  return { base: meta.base, palettes }
}

const hexToRgb = (hex: string): Rgb => {
  const value = Number.parseInt(hex.slice(1, 7), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

const colorSlots = (definition: Definition) => {
  const { recolors } = definition
  if (!recolors) return {}
  if ('material' in recolors) return { color_1: recolors as Recolor }
  return recolors as Record<string, Recolor>
}

const colorPairs = async (
  definition: Definition,
  piece: Piece,
  color?: string
) => {
  const target = piece.color === OUTFIT_COLOR ? color : piece.color
  if (target === undefined) return []
  const targets = typeof target === 'string' ? { color_1: target } : target
  const slots = colorSlots(definition)
  const pairs: { source: Rgb; target: Rgb }[] = []
  for (const [slot, name] of Object.entries(targets)) {
    const slotRecolor = slots[slot]
    if (!slotRecolor) throw new Error(`${definition.name} has no ${slot}`)
    const { base, palettes } = await paletteOf(slotRecolor.material)
    const sourceColors =
      slotRecolor.source ?? palettes[slotRecolor.base ?? base]
    const targetColors = palettes[name]
    if (!sourceColors || !targetColors)
      throw new Error(`No ${slotRecolor.material} palette ${name}`)
    for (const [index, hex] of sourceColors.entries()) {
      const targetHex = targetColors[index]
      if (targetHex)
        pairs.push({ source: hexToRgb(hex), target: hexToRgb(targetHex) })
    }
  }
  return pairs
}

const recolor = (png: PNG, pairs: { source: Rgb; target: Rgb }[]) => {
  if (pairs.length === 0) return
  const { data } = png
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) continue
    const pair = pairs.find(({ source }) =>
      source.every(
        (channel, index) =>
          Math.abs(channel - (data[offset + index] ?? 0)) <= COLOR_TOLERANCE
      )
    )
    if (!pair) continue
    data[offset] = pair.target[0]
    data[offset + 1] = pair.target[1]
    data[offset + 2] = pair.target[2]
  }
}

const buildSheet = async (directory: string, variant?: string) => {
  const sheet = new PNG({
    width: COLUMNS * FRAME_SIZE,
    height: ANIMATIONS.length * FRAME_SIZE
  })
  for (const [row, animation] of ANIMATIONS.entries()) {
    const file = variant
      ? `spritesheets/${directory}${animation.file}/${variant}.png`
      : `spritesheets/${directory}${animation.file}.png`
    const source = PNG.sync.read(await download(file))
    const sourceRow = animation.directional ? SOUTH_ROW : 0
    for (const [column, frame] of animation.cycle.entries())
      PNG.bitblt(
        source,
        sheet,
        frame * FRAME_SIZE,
        sourceRow * FRAME_SIZE,
        FRAME_SIZE,
        FRAME_SIZE,
        column * FRAME_SIZE,
        row * FRAME_SIZE
      )
  }
  return sheet
}

const isBlank = (png: PNG) => {
  for (let offset = 3; offset < png.data.length; offset += 4)
    if (png.data[offset] !== 0) return false
  return true
}

const sheets = new Map<string, Buffer>()
const usedCredits = new Map<string, Credit & { name: string }>()

const isPathPrefix = (prefix: string, path: string) =>
  path === prefix || path.startsWith(`${prefix}/`)

const recordCredits = (definition: Definition, directory: string) => {
  const path = directory.replace(/\/$/, '')
  const credits = definition.credits.filter(({ file }) =>
    isPathPrefix(file, path)
  )
  if (credits.length === 0) throw new Error(`No credits for ${directory}`)
  for (const credit of credits)
    usedCredits.set(credit.file, { name: definition.name, ...credit })
}

const importPiece = async (
  key: string,
  piece: Piece,
  bodyType: BodyType,
  color?: string
) => {
  const definition = await loadDefinition(piece.definition)
  if (piece.variant && !definition.variants?.includes(piece.variant))
    throw new Error(`${definition.name} has no variant ${piece.variant}`)
  const pairs = await colorPairs(definition, piece, color)
  const layers = []
  for (const layerKey of Object.keys(definition)) {
    if (!/^layer_\d+$/.test(layerKey)) continue
    const layer = definition[layerKey as `layer_${number}`]
    if (!layer) continue
    const directory = layer[bodyType]
    if (!directory)
      throw new Error(`${definition.name} has no ${bodyType} layer`)
    const sheet = await buildSheet(directory, piece.variant)
    recolor(sheet, pairs)
    recordCredits(definition, directory)
    if (isBlank(sheet)) continue
    const buffer = PNG.sync.write(sheet, { deflateLevel: 9 })
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 10)
    // A sheet both body types share (most hair, the items) would otherwise carry the name of the
    // first one imported
    const sharedByBodies = BODY_TYPES.every((type) => layer[type] === directory)
    const baseName = key
      .split(':')
      .filter((segment) => !sharedByBodies || segment !== bodyType)
      .join('-')
    const name = `${baseName}-${layerKey.replace('layer_', '')}.${hash}.png`
    const existing = [...sheets].find(([, content]) => content.equals(buffer))
    const fileName = existing?.[0] ?? name
    sheets.set(fileName, buffer)
    layers.push({ src: `${PUBLIC_PATH}/${fileName}`, zPos: layer.zPos })
  }
  return layers
}

const SHADOW: Piece = { definition: 'body/shadow' }
const BODY = { definition: 'body/body' }

const manifestLayers: Record<string, { src: string; zPos: number }[]> = {}

const importPart = async (key: string, piece: Piece, bodyType: BodyType) => {
  manifestLayers[key] = await importPiece(key, piece, bodyType)
  process.stdout.write('.')
}

for (const bodyType of BODY_TYPES) {
  await importPart(`shadow:${bodyType}`, SHADOW, bodyType)
  for (const skin of SKINS) {
    await importPart(
      `body:${bodyType}:${skin}`,
      { ...BODY, color: skin },
      bodyType
    )
    await importPart(
      `head:${bodyType}:${skin}`,
      {
        definition: HEADS[bodyType],
        color: { color_1: skin, color_2: EYE_COLOR }
      },
      bodyType
    )
  }
  for (const [style, definition] of Object.entries(HAIR_STYLES))
    for (const hairColor of HAIR_COLORS)
      await importPart(
        `hair:${bodyType}:${style}:${hairColor}`,
        { definition, color: hairColor },
        bodyType
      )
  for (const [characterClass, outfit] of Object.entries(OUTFITS))
    for (const outfitColor of outfit.colors) {
      const key = `outfit:${characterClass}:${bodyType}:${outfitColor}`
      const pieces = await Promise.all(
        outfit.pieces.map((piece, index) =>
          importPiece(`${key}:${index}`, piece, bodyType, outfitColor)
        )
      )
      manifestLayers[key] = pieces.flat()
      process.stdout.write('.')
    }
  for (const [item, piece] of Object.entries(ITEMS))
    await importPart(`item:${item}:${bodyType}`, piece, bodyType)
}

await rm(OUTPUT_DIR, { recursive: true, force: true })
await mkdir(OUTPUT_DIR, { recursive: true })
await Promise.all(
  [...sheets].map(([name, content]) =>
    writeFile(`${OUTPUT_DIR}/${name}`, content)
  )
)

const manifest = {
  upstream: { repository: `https://github.com/${REPOSITORY}`, commit: COMMIT },
  frameSize: FRAME_SIZE,
  columns: COLUMNS,
  animations: Object.fromEntries(
    ANIMATIONS.map(({ id, cycle }, row) => [id, { row, frames: cycle.length }])
  ),
  bodyTypes: BODY_TYPES,
  skins: SKINS,
  hairStyles: Object.keys(HAIR_STYLES),
  hairColors: HAIR_COLORS,
  outfitColors: Object.fromEntries(
    Object.entries(OUTFITS).map(([characterClass, { colors }]) => [
      characterClass,
      colors
    ])
  ),
  items: Object.keys(ITEMS),
  layers: manifestLayers,
  credits: usedCredits
    .values()
    .toArray()
    .toSorted((a, b) => a.file.localeCompare(b.file))
    .map(({ name, file, notes, authors, licenses, urls }) => ({
      name,
      file,
      ...(notes && { notes }),
      authors,
      licenses,
      urls
    }))
}

const source = `// Generated by \`pnpm sprites:import\` (src/infra/scripts/import-lpc-sprites.ts): don't edit
export const AVATAR_MANIFEST = ${JSON.stringify(manifest)} as const
`
const options = await prettier.resolveConfig(MANIFEST_FILE)
await writeFile(
  MANIFEST_FILE,
  await prettier.format(source, { ...options, filepath: MANIFEST_FILE })
)

process.stdout.write(`\n${sheets.size} sheets, ${usedCredits.size} credits\n`)
