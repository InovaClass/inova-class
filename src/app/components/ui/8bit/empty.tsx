// Ported from 8bitcn (MIT, https://github.com/theorcdev/8bitcn-ui), standalone upstream
import { cn } from 'cn'
import type { ComponentProps } from 'react'

const Empty = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    data-slot="empty"
    className={cn(
      'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-6 text-center retro text-balance md:p-12',
      className
    )}
    {...props}
  />
)

const EmptyHeader = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    data-slot="empty-header"
    className={cn(
      'flex max-w-sm flex-col items-center gap-2 text-center',
      className
    )}
    {...props}
  />
)

const EmptyTitle = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    data-slot="empty-title"
    className={cn('text-lg font-medium tracking-tight', className)}
    {...props}
  />
)

const EmptyDescription = ({ className, ...props }: ComponentProps<'p'>) => (
  <p
    data-slot="empty-description"
    className={cn('text-sm/relaxed text-muted-foreground', className)}
    {...props}
  />
)

const EmptyContent = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    data-slot="empty-content"
    className={cn(
      'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
      className
    )}
    {...props}
  />
)

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle }
