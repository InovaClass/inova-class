import type { UserRole } from '@/constants/user'

import { MESSAGE_RATE_LIMIT, MESSAGES_MAX_PAGES } from './constants'

export type StudentPoster = {
  chatEnabled: boolean
  mutedAt: Date | null
  // The messages the student posted to this class within the rate window
  recentCount: number
}

export type PostBlock = 'closed' | 'muted' | 'rate-limited'

export const postBlockOf = ({
  chatEnabled,
  mutedAt,
  recentCount
}: StudentPoster): PostBlock | undefined => {
  if (!chatEnabled) return 'closed'
  if (mutedAt) return 'muted'
  if (recentCount >= MESSAGE_RATE_LIMIT) return 'rate-limited'
}

// The teacher's ownership of the class is checked before, so any message of it is theirs to remove
export const canRemove = (
  viewer: { id: string; role: UserRole },
  message: { authorId: string; removedAt: Date | null }
) =>
  message.removedAt === null &&
  (viewer.role === 'teacher' || message.authorId === viewer.id)

// The board grows by whole pages from the latest message, so a refresh keeps the older ones listed
export const boardPagesOf = (pages: number) =>
  Math.min(Math.max(Math.trunc(pages) || 1, 1), MESSAGES_MAX_PAGES)
