import type { BehaviorValues } from '@/models/behavior/kind'

const signed = (value: number) => `${value > 0 ? '+' : '-'}${Math.abs(value)}`

export const describeBehaviorValues = ({ xp, hp, coins }: BehaviorValues) =>
  [
    xp !== 0 && `${signed(xp)} XP`,
    hp !== 0 && `${signed(hp)} HP`,
    coins !== 0 &&
      `${signed(coins)} ${Math.abs(coins) === 1 ? 'moeda' : 'moedas'}`
  ]
    .filter(Boolean)
    .join(', ')
