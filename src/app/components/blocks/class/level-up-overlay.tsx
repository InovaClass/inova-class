'use client'

import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect, useEffectEvent } from 'react'

type LevelUpOverlayProps = {
  levelUp: { id: number; level: number } | undefined
  onDone: () => void
}

const pixelSteps = (progress: number) => Math.floor(progress * 6) / 6

const SHOWN_FOR_IN_MS = 2400

const LevelUpBanner = ({
  level,
  onDone
}: {
  level: number
  onDone: () => void
}) => {
  const done = useEffectEvent(onDone)

  useEffect(() => {
    const timer = setTimeout(done, SHOWN_FOR_IN_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="pixel-border flex flex-col items-center gap-4 bg-xp px-6 py-5 text-center text-neutral-950"
        initial={{ scale: 0.4 }}
        animate={{ scale: [0.4, 1.15, 1] }}
        transition={{ duration: 0.5, ease: pixelSteps }}
      >
        <p className="text-sm leading-relaxed">Subiu de nível!</p>
        <p className="text-xl leading-relaxed">Nv. {level}</p>
      </motion.div>
    </motion.div>
  )
}

// Doesn't take the focus nor block the page, since the student may be in the middle of a purchase:
// the level is announced by the live region of the page
export const LevelUpOverlay = ({ levelUp, onDone }: LevelUpOverlayProps) => (
  <MotionConfig reducedMotion="user">
    <AnimatePresence>
      {levelUp && (
        // Keyed by the change, so a second level-up while one shows plays again
        <LevelUpBanner key={levelUp.id} level={levelUp.level} onDone={onDone} />
      )}
    </AnimatePresence>
  </MotionConfig>
)
