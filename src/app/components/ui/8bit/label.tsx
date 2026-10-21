// Ported from 8bitcn (MIT, https://github.com/theorcdev/8bitcn-ui) onto our shadcn label
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { Label as ShadcnLabel } from '@/app/components/ui/shadcn/label'

const labelVariants = cva('', {
  variants: {
    font: {
      normal: '',
      retro: 'retro'
    }
  },
  defaultVariants: {
    font: 'retro'
  }
})

const Label = ({
  className,
  font,
  ...props
}: ComponentProps<typeof ShadcnLabel> & VariantProps<typeof labelVariants>) => (
  <ShadcnLabel className={cn(labelVariants({ font }), className)} {...props} />
)

export { Label }
