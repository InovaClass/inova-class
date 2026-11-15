// Ported from 8bitcn (MIT, https://github.com/theorcdev/8bitcn-ui) onto our shadcn radio group and
// Base UI's Radio, which upstream's item uses directly
import { Radio } from '@base-ui/react/radio'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

import { RadioGroup as ShadcnRadioGroup } from '@/app/components/ui/shadcn/radio-group'

const radioGroupVariants = cva('', {
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

const RadioGroup = ({
  className,
  font,
  ...props
}: ComponentProps<typeof ShadcnRadioGroup> &
  VariantProps<typeof radioGroupVariants>) => (
  <ShadcnRadioGroup
    className={cn('group/radio-group', radioGroupVariants({ font }), className)}
    {...props}
  />
)

const RadioGroupItem = ({ className, ...props }: Radio.Root.Props) => (
  <span
    data-slot="radio-group-item-frame"
    className={cn(
      'pixel-border inline-flex shrink-0 items-center justify-center group-aria-invalid/radio-group:[--pixel-border:var(--destructive)] has-focus-visible:outline-3 has-focus-visible:outline-offset-9 has-focus-visible:outline-foreground dark:has-focus-visible:outline-ring',
      className
    )}
  >
    <Radio.Root
      data-slot="radio-group-item"
      className="flex size-5 items-center justify-center outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
      {...props}
    >
      <Radio.Indicator
        data-slot="radio-group-indicator"
        className="size-2.5 bg-foreground dark:bg-ring"
      />
    </Radio.Root>
  </span>
)

export { RadioGroup, RadioGroupItem }
