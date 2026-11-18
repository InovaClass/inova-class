'use client'

import { MotionConfig } from 'motion/react'
import { type ReactNode, useState } from 'react'

import { CharacterAvatar } from '@/app/components/ui/custom/character-avatar'
import {
  avatarAnimationFor,
  type StatsSnapshot
} from '@/app/helpers/stat-change'
import { useStatChanges } from '@/app/hooks/use-stat-changes'
import type { AvatarLook } from '@/models/avatar/layers'

import { FloatingDeltas } from './floating-deltas'
import { LevelUpOverlay } from './level-up-overlay'

type StatsAvatarProps = {
  look: AvatarLook | null
  stats: StatsSnapshot
  scale: 1 | 2
  // Shown still between changes, as in a list where many animated avatars would distract
  still?: boolean
  // The student's own screen: the level-up gets the overlay and an announcement
  celebrate?: boolean
  // What stands in for the avatar of a student who hasn't chosen the character
  placeholder?: ReactNode
}

export const StatsAvatar = ({
  look,
  stats,
  scale,
  still = false,
  celebrate = false,
  placeholder
}: StatsAvatarProps) => {
  const { changes, latest, dismiss, levelUp, dismissLevelUp } =
    useStatChanges(stats)
  const [endedId, setEndedId] = useState<number>()
  const animation =
    latest && latest.id !== endedId ? avatarAnimationFor(latest) : undefined

  return (
    <MotionConfig reducedMotion="user">
      {/* Without anything to show, the numbers float over the parent instead of taking a flex slot */}
      <div className={look || placeholder ? 'relative shrink-0' : 'absolute'}>
        {look ? (
          <CharacterAvatar
            // A new change plays its animation from the first frame, even the same one again
            key={animation ? latest?.id : 'idle'}
            look={look}
            scale={scale}
            animation={animation}
            still={still && !animation}
            onAnimationEnd={() => setEndedId(latest?.id)}
          />
        ) : (
          placeholder
        )}
        <FloatingDeltas
          changes={changes}
          onDone={dismiss}
          showLevelUp={!celebrate}
        />
      </div>
      {celebrate && (
        <>
          <LevelUpOverlay levelUp={levelUp} onDone={dismissLevelUp} />
          <p aria-live="polite" className="sr-only">
            {levelUp && `Você subiu para o nível ${levelUp.level}!`}
          </p>
        </>
      )}
    </MotionConfig>
  )
}
