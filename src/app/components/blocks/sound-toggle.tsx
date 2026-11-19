'use client'

import { Button } from '@/app/components/ui/8bit/button'
import { setSoundMuted } from '@/app/helpers/sound-preference'
import { useSoundMuted } from '@/app/hooks/use-sound-muted'

type Pixel = readonly [x: number, y: number, height?: number]

const SPEAKER: Pixel[] = [
  [0, 2, 3],
  [1, 2, 3],
  [2, 1, 5],
  [3, 0, 7]
]
const WAVES: Pixel[] = [
  [5, 2, 3],
  [6, 1],
  [7, 2, 3],
  [6, 5]
]
const CROSS: Pixel[] = [
  [5, 2],
  [7, 2],
  [6, 3],
  [5, 4],
  [7, 4]
]

// Drawn on an 8 px grid, since lucide's smooth strokes clash with the pixel font
const PixelIcon = ({ pixels }: { pixels: Pixel[] }) => (
  <svg
    aria-hidden="true"
    viewBox="0 -0.5 8 8"
    shapeRendering="crispEdges"
    fill="currentColor"
    className="size-4"
  >
    {pixels.map(([x, y, height = 1]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width={1} height={height} />
    ))}
  </svg>
)

export const SoundToggle = () => {
  const muted = useSoundMuted()

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Silenciar sons"
      aria-pressed={muted}
      // The icon alone doesn't tell a pointer user what the button does
      title="Silenciar sons"
      onClick={() => setSoundMuted(!muted)}
    >
      <PixelIcon pixels={[...SPEAKER, ...(muted ? CROSS : WAVES)]} />
    </Button>
  )
}
