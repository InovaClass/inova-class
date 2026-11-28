// Ported from 8bitcn (MIT, https://github.com/theorcdev/8bitcn-ui) onto our shadcn alert
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import {
  Alert as ShadcnAlert,
  AlertDescription as ShadcnAlertDescription,
  AlertTitle as ShadcnAlertTitle
} from '@/app/components/ui/shadcn/alert'

const alertVariants = cva(
  // The frame is drawn outside the alert by `pixel-border`, in place of upstream's twelve divs
  'pixel-border rounded-none border-none bg-background',
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

const Alert = ({
  className,
  font,
  ...props
}: ComponentProps<typeof ShadcnAlert> & VariantProps<typeof alertVariants>) => (
  <ShadcnAlert className={cn(alertVariants({ font }), className)} {...props} />
)

const AlertTitle = ({
  className,
  ...props
}: ComponentProps<typeof ShadcnAlertTitle>) => (
  <ShadcnAlertTitle
    className={cn('line-clamp-1 font-medium tracking-tight', className)}
    {...props}
  />
)

const AlertDescription = ({
  className,
  ...props
}: ComponentProps<typeof ShadcnAlertDescription>) => (
  <ShadcnAlertDescription
    className={cn(
      'grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
      className
    )}
    {...props}
  />
)

export { Alert, AlertDescription, AlertTitle }
