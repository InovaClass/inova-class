import type { AvatarAnimation } from '@/models/avatar/layers'
import { xpForLevel } from '@/models/ledger/level'

import type { SoundEffect } from './sound-manifest'

export type StatsSnapshot = {
  progress: { level: number; current: number }
  hp: number
  coins: number
}

export type StatChange = {
  xp: number
  hp: number
  coins: number
  // The level reached, only when it went up
  levelReached?: number
}

const totalXp = ({ progress }: StatsSnapshot) =>
  xpForLevel(progress.level) + progress.current

export const statChangeOf = (
  previous: StatsSnapshot,
  next: StatsSnapshot
): StatChange | undefined => {
  const change = {
    xp: totalXp(next) - totalXp(previous),
    hp: next.hp - previous.hp,
    coins: next.coins - previous.coins
  }
  if (change.xp === 0 && change.hp === 0 && change.coins === 0) return
  return next.progress.level > previous.progress.level
    ? { ...change, levelReached: next.progress.level }
    : change
}

export const avatarAnimationFor = ({
  xp,
  hp
}: StatChange): AvatarAnimation | undefined => {
  if (hp < 0) return 'hurt'
  if (xp > 0 || hp > 0) return 'cast'
}

// One sound per change, the most significant one. Spending coins plays nothing, as the avatar does
export const soundFor = (change: StatChange): SoundEffect | undefined => {
  if (change.levelReached) return 'level-up'
  if (change.hp < 0) return 'hurt'
  if (change.xp > 0 || change.hp > 0) return 'power-up'
  if (change.coins > 0) return 'coins'
}
