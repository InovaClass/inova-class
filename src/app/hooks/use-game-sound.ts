import { useEffect, useEffectEvent } from 'react'

import { playSound } from '@/app/helpers/game-sound'
import type { SoundEffect } from '@/app/helpers/sound-manifest'
import { isSoundMuted } from '@/app/helpers/sound-preference'

// A game event shows up as a new value on the page (see Gameplay animations in AGENTS.md), not as
// a callback, so a sound follows a value
export const useGameSound = (
  effect: SoundEffect | undefined,
  trigger: unknown
) => {
  const play = useEffectEvent(() => {
    if (effect && !isSoundMuted()) void playSound(effect)
  })

  useEffect(() => {
    play()
  }, [trigger])
}
