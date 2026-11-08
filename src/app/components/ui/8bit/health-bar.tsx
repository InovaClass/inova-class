// Ported from 8bitcn's health-bar (MIT, https://www.8bitcn.com/docs/components/health-bar)
import { HP_MAX } from '@/constants/game'

import { Progress, type ProgressProps } from './progress'

type HealthBarProps = Omit<ProgressProps, 'indicatorClassName' | 'max'> & {
  max?: number
}

export const HealthBar = ({
  value,
  max = HP_MAX,
  ...props
}: HealthBarProps) => (
  <Progress
    aria-label="HP"
    aria-valuetext={`${value} de ${max} HP`}
    value={value}
    max={max}
    indicatorClassName="bg-hp"
    {...props}
  />
)
