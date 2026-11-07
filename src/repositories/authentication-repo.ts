import { eq, sql } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { users, verificationResends } from '@/infra/database/schema'

const recordVerificationSent = async (identifier: string, now: Date) =>
  database
    .insert(verificationResends)
    .values({ identifier, sentAt: now })
    .onConflictDoUpdate({
      target: verificationResends.identifier,
      set: { sentAt: now }
    })

// A single statement, so parallel requests can't all pass the cooldown together. Returns when the
// last email was sent, which is `now` only when this request claimed the send
const claimVerificationResend = async (
  identifier: string,
  { now, cooldownEndedSince }: { now: Date; cooldownEndedSince: Date }
) => {
  const [claimed] = await database
    .insert(verificationResends)
    .values({ identifier, sentAt: now })
    .onConflictDoUpdate({
      target: verificationResends.identifier,
      set: { sentAt: now },
      setWhere: sql`${verificationResends.sentAt} <= ${cooldownEndedSince.toISOString()}::timestamptz`
    })
    .returning()
  if (claimed) return claimed.sentAt
  const [current] = await database
    .select({ sentAt: verificationResends.sentAt })
    .from(verificationResends)
    .where(eq(verificationResends.identifier, identifier))
  return current!.sentAt
}

const findEmailByUsername = async (username: string) => {
  const [user] = await database
    .select({ email: users.email })
    .from(users)
    .where(eq(users.username, username))
  return user?.email
}

export const authenticationRepo = {
  recordVerificationSent,
  claimVerificationResend,
  findEmailByUsername
}
