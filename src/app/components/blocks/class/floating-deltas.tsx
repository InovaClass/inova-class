'use client'

import { cn } from 'cn'
import { motion } from 'motion/react'

import { CoinIcon } from '@/app/components/ui/custom/coin-counter'
import { signed } from '@/app/helpers/behavior-values'
import type { IdentifiedStatChange } from '@/app/hooks/use-stat-changes'

type FloatingDeltasProps = {
  changes: IdentifiedStatChange[]
  onDone: (id: number) => void
  // Off where a bigger celebration already shows the level reached
  showLevelUp?: boolean
}

// Whole steps, like the avatar's 8 fps frames: a smooth glide would clash with the pixel art
const pixelSteps = (progress: number) => Math.floor(progress * 8) / 8

// neutral-950 on both themes: the game tokens are mid-tones, too faint over the light background
const CHIP_CLASSES = 'bg-neutral-950 px-1 py-0.5 text-xs whitespace-nowrap'

// The values already change on the page, so the numbers stay out of the accessibility tree
export const FloatingDeltas = ({
  changes,
  onDone,
  showLevelUp = true
}: FloatingDeltasProps) => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute top-0 left-0 z-20"
  >
    {changes.map(({ id, xp, hp, coins, levelReached }) => (
      <motion.div
        key={id}
        className="absolute top-0 left-0 flex flex-col items-start gap-1"
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: [0, 1, 1, 0], y: -40 }}
        transition={{
          duration: 1.6,
          ease: pixelSteps,
          opacity: { duration: 1.6, times: [0, 0.1, 0.75, 1] }
        }}
        onAnimationComplete={() => onDone(id)}
      >
        {showLevelUp && levelReached && (
          <span className={cn(CHIP_CLASSES, 'text-xp')}>
            Nv. {levelReached}!
          </span>
        )}
        {xp !== 0 && (
          <span className={cn(CHIP_CLASSES, 'text-xp')}>{signed(xp)} XP</span>
        )}
        {hp !== 0 && (
          <span className={cn(CHIP_CLASSES, 'text-hp')}>{signed(hp)} HP</span>
        )}
        {coins !== 0 && (
          <span
            className={cn(
              CHIP_CLASSES,
              'inline-flex items-center gap-1 text-coin'
            )}
          >
            <motion.span
              className="inline-flex"
              animate={{ scaleX: [1, 0.2, -1, 0.2, 1] }}
              transition={{ duration: 0.6, ease: pixelSteps, repeat: 1 }}
            >
              <CoinIcon />
            </motion.span>
            {signed(coins)}
          </span>
        )}
      </motion.div>
    ))}
  </div>
)
