// Ported from 8bitcn's dialog (MIT, https://www.8bitcn.com/docs/components/dialog) onto our shadcn dialog
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { DialogContent as ShadcnDialogContent } from '@/app/components/ui/shadcn/dialog'

const DialogContent = ({
  className,
  children,
  ...props
}: ComponentProps<typeof ShadcnDialogContent>) => (
  <ShadcnDialogContent
    showCloseButton={false}
    className={cn(
      // `pixel-border` sets `position: relative`, which would take the dialog out of the viewport's
      // center. The narrower width keeps the frame, drawn outside the box, on a phone's screen
      'pixel-border fixed! block w-[calc(100%-3rem)] rounded-none bg-card p-0 retro ring-0',
      className
    )}
    {...props}
  >
    {/* On an inner box, since overflow on the popup would clip the frame; the padding keeps the
    buttons' frames and focus outlines inside it */}
    <div className="grid max-h-[calc(100dvh-4rem)] gap-4 overflow-y-auto p-4">
      {children}
    </div>
  </ShadcnDialogContent>
)

export { DialogContent }
