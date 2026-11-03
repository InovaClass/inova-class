import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '@/constants/user'

const FALLBACK_BASE = 'aluno'

// Leaves room for the suffix of a collision, so every candidate starts with the base
const BASE_MAX_LENGTH = USERNAME_MAX_LENGTH - 3

export const usernameBase = (name: string) => {
  const parts = name
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  const base = [parts[0], parts.length > 1 ? parts.at(-1) : undefined]
    .filter(Boolean)
    .join('.')
    .slice(0, BASE_MAX_LENGTH)
    .replace(/\.$/, '')
  return base.length >= USERNAME_MIN_LENGTH ? base : FALLBACK_BASE
}

export const generateUsername = (name: string, taken: ReadonlySet<string>) => {
  const base = usernameBase(name)
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}${suffix}`)) suffix++
  return `${base}${suffix}`
}
