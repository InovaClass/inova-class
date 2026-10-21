import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { Button } from '@/app/components/ui/8bit/button'
import { Spinner } from '@/app/components/ui/8bit/spinner'

export const SubmitButton = ({
  pending,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, 'type' | 'disabled'> & {
  pending: boolean
}) => (
  <Button
    type="submit"
    disabled={pending}
    focusableWhenDisabled
    // focusableWhenDisabled sets aria-disabled instead of the native disabled attribute, which is
    // the only state the shadcn button styles
    className={cn(
      'aria-disabled:pointer-events-none aria-disabled:opacity-50',
      className
    )}
    {...props}
  >
    {pending && <Spinner aria-hidden className="size-4" />}
    {children}
  </Button>
)
