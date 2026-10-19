// Ported from 8bitcn (MIT, https://github.com/theorcdev/8bitcn-ui) onto our shadcn card
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import {
  Card as ShadcnCard,
  CardFooter as ShadcnCardFooter,
  CardHeader as ShadcnCardHeader
} from '@/app/components/ui/shadcn/card'

const cardVariants = cva(
  // The frame is drawn outside the card, so it can't clip its overflow
  'pixel-border overflow-visible rounded-none ring-0 *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none',
  {
    variants: {
      font: {
        normal: '',
        retro: 'retro'
      }
    },
    defaultVariants: {
      font: 'normal'
    }
  }
)

const Card = ({
  className,
  font,
  ...props
}: ComponentProps<typeof ShadcnCard> & VariantProps<typeof cardVariants>) => (
  <ShadcnCard className={cn(cardVariants({ font }), className)} {...props} />
)

const CardHeader = ({
  className,
  ...props
}: ComponentProps<typeof ShadcnCardHeader>) => (
  <ShadcnCardHeader className={cn('rounded-none', className)} {...props} />
)

const CardFooter = ({
  className,
  ...props
}: ComponentProps<typeof ShadcnCardFooter>) => (
  <ShadcnCardFooter className={cn('rounded-none', className)} {...props} />
)

export { Card, CardFooter, CardHeader }
