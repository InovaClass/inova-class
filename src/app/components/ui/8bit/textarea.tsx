// Ported from 8bitcn (MIT, https://github.com/theorcdev/8bitcn-ui) onto our shadcn textarea
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { Textarea as ShadcnTextarea } from '@/app/components/ui/shadcn/textarea'

const textareaVariants = cva(
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

// A <textarea> can't have pseudo-elements, so the frame goes on a wrapper that takes the layout classes
const Textarea = ({
  className,
  font,
  ...props
}: ComponentProps<typeof ShadcnTextarea> &
  VariantProps<typeof textareaVariants>) => (
  <div
    data-slot="textarea-frame"
    className={cn(
      'pixel-border flex w-full has-focus-visible:outline-3 has-focus-visible:outline-offset-9 has-focus-visible:outline-foreground has-disabled:opacity-50 has-aria-invalid:[--pixel-border:var(--destructive)] dark:has-focus-visible:outline-ring',
      className
    )}
  >
    <ShadcnTextarea className={textareaVariants({ font })} {...props} />
  </div>
)

export { Textarea }
