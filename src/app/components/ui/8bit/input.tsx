// Ported from 8bitcn (MIT, https://github.com/theorcdev/8bitcn-ui) onto Base UI
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { Input as ShadcnInput } from '@/app/components/ui/shadcn/input'

const inputVariants = cva(
  'rounded-none border-0 focus-visible:ring-0 aria-invalid:ring-0',
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

// An <input> can't have pseudo-elements, so the frame goes on a wrapper that takes the layout classes
const Input = ({
  className,
  font,
  ...props
}: ComponentProps<typeof ShadcnInput> & VariantProps<typeof inputVariants>) => (
  <div
    data-slot="input-frame"
    className={cn(
      'pixel-border flex w-full items-center has-focus-visible:outline-3 has-focus-visible:outline-offset-9 has-focus-visible:outline-foreground has-disabled:opacity-50 has-aria-invalid:[--pixel-border:var(--destructive)] dark:has-focus-visible:outline-ring',
      className
    )}
  >
    <ShadcnInput className={inputVariants({ font })} {...props} />
  </div>
)

export { Input }
