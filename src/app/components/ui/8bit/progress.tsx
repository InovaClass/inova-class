// Ported from 8bitcn's progress, retro variant (MIT, https://www.8bitcn.com/docs/components/progress)
import { Meter } from '@base-ui/react/meter'
import { cn } from 'cn'

const SEGMENTS = 20

// Rounding alone would show 1 HP as an empty bar and 49 of 50 HP as a full one
export const filledSegments = (value: number, max: number) => {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  if (ratio === 0 || ratio === 1) return ratio * SEGMENTS
  return Math.min(Math.max(Math.round(ratio * SEGMENTS), 1), SEGMENTS - 1)
}

export type ProgressProps = Omit<
  Meter.Root.Props,
  'className' | 'getAriaValueText' | 'max' | 'min' | 'value'
> & {
  value: number
  max: number
  className?: string
  indicatorClassName?: string
}

// Meter instead of Base UI's Progress, which is for a task underway: HP and XP are values in a range
export const Progress = ({
  value,
  max,
  className,
  indicatorClassName,
  ...props
}: ProgressProps) => (
  <Meter.Root
    data-slot="progress"
    value={value}
    max={max}
    className={cn('pixel-border h-2 w-full', className)}
    {...props}
  >
    <Meter.Track className="size-full bg-primary/90 mask-[repeating-linear-gradient(to_right,black_0,black_calc(5%-2px),transparent_calc(5%-2px),transparent_5%)] dark:bg-primary/20">
      <Meter.Indicator
        className={cn(
          'bg-primary transition-[width] duration-300 ease-[steps(5)] motion-reduce:transition-none',
          indicatorClassName
        )}
        style={{ width: `${(filledSegments(value, max) / SEGMENTS) * 100}%` }}
      />
    </Meter.Track>
  </Meter.Root>
)
