import { useSyncExternalStore } from 'react'

import {
  isSoundMuted,
  subscribeToSoundMuted
} from '@/app/helpers/sound-preference'

// Sounds are on by default, which is also all the server knows
const mutedOnServer = () => false

export const useSoundMuted = () =>
  useSyncExternalStore(subscribeToSoundMuted, isSoundMuted, mutedOnServer)
