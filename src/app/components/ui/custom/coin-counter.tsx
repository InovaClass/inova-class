import { cn } from 'cn'
import type { ComponentProps } from 'react'

const COIN_ROWS = [
  [2, 0, 4],
  [1, 1, 6],
  [0, 2, 8],
  [0, 3, 8],
  [0, 4, 8],
  [0, 5, 8],
  [1, 6, 6],
  [2, 7, 4]
] as const

export const CoinIcon = ({
  className,
  ...props
}: Omit<ComponentProps<'svg'>, 'children'>) => (
  <svg
    viewBox="0 0 8 8"
    shapeRendering="crispEdges"
    aria-hidden="true"
    className={cn('size-4 fill-coin', className)}
    {...props}
  >
    {COIN_ROWS.map(([x, y, width]) => (
      <rect key={y} x={x} y={y} width={width} height="1" />
    ))}
  </svg>
)

type CoinCounterProps = Omit<ComponentProps<'span'>, 'children'> & {
  value: number
}

export const CoinCounter = ({
  value,
  className,
  ...props
}: CoinCounterProps) => (
  <span
    data-slot="coin-counter"
    className={cn('inline-flex items-center gap-2 text-xs', className)}
    {...props}
  >
    <CoinIcon />
    <span>
      {value.toLocaleString('pt-BR')}
      <span className="sr-only"> {value === 1 ? 'moeda' : 'moedas'}</span>
    </span>
  </span>
)
