// Ported from 8bitcn's xp-bar (MIT, https://www.8bitcn.com/docs/components/xp-bar)
import { Progress, type ProgressProps } from './progress'

type XpBarProps = Omit<ProgressProps, 'indicatorClassName'>

export const XpBar = ({ value, max, ...props }: XpBarProps) => (
  <Progress
    aria-label="XP"
    aria-valuetext={`${value} de ${max} XP`}
    value={value}
    max={max}
    indicatorClassName="bg-xp"
    {...props}
  />
)
