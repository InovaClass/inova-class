// Ported from 8bitcn's spinner, classic variant (MIT, https://www.8bitcn.com/docs/components/spinner)
import { cn } from 'cn'
import type { ComponentProps } from 'react'

const CELLS = [
  [200, 80],
  [200, 96],
  [184, 96],
  [184, 80],
  [200, 64],
  [168, 96],
  [168, 64],
  [152, 48],
  [136, 48],
  [120, 48],
  [56, 64],
  [72, 64],
  [88, 48],
  [104, 48],
  [56, 80],
  [40, 80],
  [40, 96],
  [40, 112],
  [72, 144],
  [40, 160],
  [104, 192],
  [88, 192],
  [40, 176],
  [56, 160],
  [56, 144],
  [40, 144],
  [120, 192],
  [136, 192],
  [152, 192],
  [168, 192],
  [72, 48],
  [72, 176],
  [168, 176],
  [184, 176],
  [184, 160],
  [200, 160],
  [200, 144],
  [200, 128]
] as const

export const Spinner = ({ className, ...props }: ComponentProps<'svg'>) => (
  <svg
    viewBox="0 0 256 256"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="0.25"
    role="status"
    aria-label="Carregando"
    className={cn('size-5 animate-spin', className)}
    {...props}
  >
    {CELLS.map(([x, y]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width="14" height="14" rx="1" />
    ))}
  </svg>
)
