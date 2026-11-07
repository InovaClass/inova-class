import { LEVEL_XP_STEP } from './constants'

// Level n takes LEVEL_XP_STEP·n·(n−1) XP in total: 100 for level 2, 300 for level 3, 600 for level 4
export const xpForLevel = (level: number) => LEVEL_XP_STEP * level * (level - 1)

export const levelOf = (xp: number) => {
  let level = Math.floor(
    (1 + Math.sqrt(1 + (4 * Math.max(xp, 0)) / LEVEL_XP_STEP)) / 2
  )
  // The square root is a float, so near a threshold the closed form can land one level off
  while (xpForLevel(level + 1) <= xp) level++
  while (level > 1 && xpForLevel(level) > xp) level--
  return level
}
