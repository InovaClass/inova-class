'use client'

// Ported from 8bitcn (MIT, https://github.com/theorcdev/8bitcn-ui) onto our shadcn alert dialog
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { Button } from '@/app/components/ui/8bit/button'
import {
  AlertDialogCancel as ShadcnAlertDialogCancel,
  AlertDialogContent as ShadcnAlertDialogContent,
  AlertDialogFooter as ShadcnAlertDialogFooter
} from '@/app/components/ui/shadcn/alert-dialog'

const AlertDialogContent = ({
  className,
  children,
  ...props
}: ComponentProps<typeof ShadcnAlertDialogContent>) => (
  <ShadcnAlertDialogContent
    className={cn(
      // `pixel-border` sets `position: relative`, which would take the dialog out of the viewport's
      // center. The narrower width keeps the frame, drawn outside the box, on a phone's screen
      'pixel-border fixed! block w-[calc(100%-3rem)] rounded-none p-0 retro ring-0',
      className
    )}
    {...props}
  >
    {/* Scrolls on a short viewport or at 400% zoom. On an inner box, since overflow on the popup
    would clip the frame; the padding keeps the buttons' frames and focus outlines inside it */}
    <div className="grid max-h-[calc(100dvh-4rem)] gap-4 overflow-y-auto p-4">
      {children}
    </div>
  </ShadcnAlertDialogContent>
)

const AlertDialogFooter = ({
  className,
  ...props
}: ComponentProps<typeof ShadcnAlertDialogFooter>) => (
  <ShadcnAlertDialogFooter
    className={cn(
      'mx-0 mb-0 gap-4 rounded-none border-0 bg-transparent p-0',
      className
    )}
    {...props}
  />
)

const AlertDialogCancel = (
  props: ComponentProps<typeof ShadcnAlertDialogCancel>
) => (
  <ShadcnAlertDialogCancel render={<Button variant="outline" />} {...props} />
)

export { AlertDialogCancel, AlertDialogContent, AlertDialogFooter }
