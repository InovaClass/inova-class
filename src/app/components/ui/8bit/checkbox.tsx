// Ported from 8bitcn (MIT, https://github.com/theorcdev/8bitcn-ui) onto our shadcn checkbox
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { Checkbox as ShadcnCheckbox } from '@/app/components/ui/shadcn/checkbox'

const checkboxVariants = cva(
  'size-5 rounded-none border-none focus-visible:ring-0 aria-invalid:ring-0',
  {
    variants: {
      font: {
        normal: '',
        retro: 'retro'
      }
    },
    defaultVariants: {
      font: 'retro'
    }
  }
)

const Checkbox = ({
  className,
  font,
  ...props
}: ComponentProps<typeof ShadcnCheckbox> &
  VariantProps<typeof checkboxVariants>) => (
  <span
    data-slot="checkbox-frame"
    className={cn(
      'pixel-border inline-flex shrink-0 items-center justify-center has-focus-visible:outline-3 has-focus-visible:outline-offset-9 has-focus-visible:outline-foreground has-aria-invalid:[--pixel-border:var(--destructive)] dark:has-focus-visible:outline-ring',
      className
    )}
  >
    <ShadcnCheckbox className={checkboxVariants({ font })} {...props} />
  </span>
)

export { Checkbox }
