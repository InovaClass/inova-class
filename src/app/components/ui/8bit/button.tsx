// Ported from 8bitcn (MIT, https://github.com/theorcdev/8bitcn-ui) onto Base UI
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import {
  Button as ShadcnButton,
  buttonVariants as shadcnButtonVariants
} from '@/app/components/ui/shadcn/button'

const buttonVariants = cva(
  'rounded-none focus-visible:ring-0 focus-visible:outline-3 focus-visible:outline-offset-9 focus-visible:outline-foreground focus-visible:outline-solid active:not-aria-[haspopup]:translate-y-1 dark:focus-visible:outline-ring',
  {
    variants: {
      font: {
        normal: '',
        retro: 'retro'
      },
      frame: {
        true: 'pixel-border border-none',
        false: ''
      }
    },
    defaultVariants: {
      font: 'retro',
      frame: true
    }
  }
)

type ButtonProps = ComponentProps<typeof ShadcnButton> &
  Pick<VariantProps<typeof buttonVariants>, 'font'>

const hasFrame = (variant: ButtonProps['variant']) =>
  variant !== 'ghost' && variant !== 'link'

const hasBevel = (variant: ButtonProps['variant'], size: ButtonProps['size']) =>
  hasFrame(variant) && variant !== 'outline' && !size?.startsWith('icon')

const Bevel = () => (
  <span
    aria-hidden="true"
    data-slot="button-bevel"
    className="pointer-events-none contents"
  >
    <span className="absolute top-0 left-0 h-1 w-full bg-foreground/20" />
    <span className="absolute top-1 left-0 h-1 w-2 bg-foreground/20" />
    <span className="absolute bottom-0 left-0 h-1 w-full bg-foreground/20" />
    <span className="absolute right-0 bottom-1 h-1 w-2 bg-foreground/20" />
  </span>
)

const Button = ({
  className,
  children,
  font,
  variant,
  size,
  ...props
}: ButtonProps) => (
  <ShadcnButton
    className={cn(
      buttonVariants({ font, frame: hasFrame(variant) }),
      className
    )}
    variant={variant}
    size={size}
    {...props}
  >
    {children}
    {hasBevel(variant, size) && <Bevel />}
  </ShadcnButton>
)

// Links keep link semantics, so they take the button's classes instead of rendering through it.
// Only variants without a bevel, which classes alone can't draw
const linkButtonVariants = ({
  variant,
  size,
  font
}: Pick<ButtonProps, 'size' | 'font'> & {
  variant?: 'outline' | 'ghost' | 'link'
} = {}) =>
  cn(
    shadcnButtonVariants({ variant, size }),
    buttonVariants({ font, frame: hasFrame(variant) })
  )

export { Button, linkButtonVariants }
