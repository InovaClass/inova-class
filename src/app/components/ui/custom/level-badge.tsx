import { cn } from 'cn'
import type { ComponentProps } from 'react'

type LevelBadgeProps = Omit<ComponentProps<'span'>, 'children'> & {
  level: number
}

// neutral-950 on both themes: --xp is a mid-tone sky, where the theme's own light foreground fails contrast
export const LevelBadge = ({ level, className, ...props }: LevelBadgeProps) => (
  <span
    data-slot="level-badge"
    className={cn(
      'pixel-border m-1.5 inline-block w-fit bg-xp px-1.5 py-1 text-xs text-neutral-950',
      className
    )}
    {...props}
  >
    <span aria-hidden="true">Nv. {level}</span>
    <span className="sr-only">Nível {level}</span>
  </span>
)
