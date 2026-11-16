// Ported from 8bitcn's badge (MIT, https://www.8bitcn.com/docs/components/badge)
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { Badge as ShadcnBadge } from '@/app/components/ui/shadcn/badge'

export const badgeVariants = cva('', {
  variants: {
    font: {
      normal: '',
      retro: 'retro'
    },
    variant: {
      default: 'border-primary bg-primary',
      destructive: 'border-destructive bg-destructive',
      outline: 'border-background bg-background',
      secondary: 'border-secondary bg-secondary'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

type BadgeProps = Omit<ComponentProps<typeof ShadcnBadge>, 'variant'> &
  VariantProps<typeof badgeVariants>

const isVisualClass = (name: string) =>
  ['bg-', 'border-', 'text-', 'rounded-'].some((prefix) =>
    name.startsWith(prefix)
  )

export const Badge = ({
  children,
  className = '',
  font,
  variant,
  ...props
}: BadgeProps) => {
  const color = badgeVariants({ variant, font })
  const classes = typeof className === 'string' ? className.split(' ') : []
  const visualClasses = classes.filter((name) => isVisualClass(name))
  const containerClasses = classes.filter((name) => !isVisualClass(name))

  return (
    <span
      className={cn('relative inline-flex items-stretch', containerClasses)}
    >
      <ShadcnBadge
        {...props}
        className={cn(
          'size-full rounded-none',
          font !== 'normal' && 'retro',
          visualClasses
        )}
        variant={variant}
      >
        {children}
      </ShadcnBadge>
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-1 -left-1.5 w-1.5',
          color,
          visualClasses
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-1 -right-1.5 w-1.5',
          color,
          visualClasses
        )}
      />
    </span>
  )
}
