const STORAGE_KEY = 'inova-class:sound-muted'

const listeners = new Set<() => void>()
// Keeps the choice for this page when the browser blocks the storage (private mode, blocked site data)
const inMemory = { muted: false }

export const isSoundMuted = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return inMemory.muted
  }
}

export const setSoundMuted = (muted: boolean) => {
  inMemory.muted = muted
  try {
    if (muted) localStorage.setItem(STORAGE_KEY, 'true')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Already kept in `inMemory`, which `isSoundMuted` falls back to
  }
  for (const listener of listeners) listener()
}

// Another tab of the app changes the same choice
export const subscribeToSoundMuted = (listener: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener()
  }
  listeners.add(listener)
  addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    removeEventListener('storage', onStorage)
  }
}
