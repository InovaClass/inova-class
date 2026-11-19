import { SOUND_EFFECTS, type SoundEffect } from './sound-manifest'

// A behavior awarded to the whole roster changes every avatar at once, and should sound once
export const REPEAT_WINDOW_IN_MS = 150

export const createRepeatGuard = (windowInMs: number) => {
  const lastPlayedAt = new Map<string, number>()
  return (key: string, now: number) => {
    const last = lastPlayedAt.get(key)
    if (last !== undefined && now - last < windowInMs) return false
    lastPlayedAt.set(key, now)
    return true
  }
}

const shouldPlay = createRepeatGuard(REPEAT_WINDOW_IN_MS)
const buffers = new Map<SoundEffect, Promise<AudioBuffer>>()
const audio: { context?: AudioContext } = {}

// Browsers keep audio off until the person interacts with the page: a sound from before that is
// dropped instead of playing late, all at once, on the first click
const runningContext = async () => {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive)
    return
  audio.context ??= new AudioContext()
  if (audio.context.state === 'suspended') await audio.context.resume()
  return audio.context.state === 'running' ? audio.context : undefined
}

const loadBuffer = async (context: AudioContext, effect: SoundEffect) => {
  try {
    const response = await fetch(SOUND_EFFECTS[effect])
    return await context.decodeAudioData(await response.arrayBuffer())
  } catch (error) {
    // A failed load is tried again on the next play
    buffers.delete(effect)
    throw error
  }
}

const bufferOf = (context: AudioContext, effect: SoundEffect) => {
  const cached = buffers.get(effect)
  if (cached) return cached
  const buffer = loadBuffer(context, effect)
  buffers.set(effect, buffer)
  return buffer
}

export const playSound = async (effect: SoundEffect) => {
  if (!shouldPlay(effect, performance.now())) return
  try {
    const context = await runningContext()
    if (!context) return
    const source = context.createBufferSource()
    source.buffer = await bufferOf(context, effect)
    source.connect(context.destination)
    source.start()
  } catch (error) {
    // A sound is a bonus: one that fails never gets in the way of the game
    console.warn(`Could not play the ${effect} sound`, error)
  }
}
