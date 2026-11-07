import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  snakeCase,
  text,
  timestamp,
  unique,
  uuid
} from 'drizzle-orm/pg-core'

import { HP_MAX, LEDGER_ENTRY_TYPES } from '@/constants/game'
import { USER_ROLES } from '@/constants/user'

// The tables up to `verifications` are Better Auth's, kept in sync with `pnpm dlx auth@latest generate` (#3)

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
}

export const users = snakeCase.table('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  username: text().unique(),
  displayUsername: text(),
  role: text({ enum: USER_ROLES }).notNull(),
  termsAcceptedAt: timestamp({ withTimezone: true }),
  // Kept out of Better Auth's fields, since only `studentRepo` writes it and nothing reads it through
  // the session (#10)
  createdById: uuid().references((): AnyPgColumn => users.id, {
    onDelete: 'set null'
  }),
  ...timestamps
})

export const sessions = snakeCase.table(
  'sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps
  },
  (table) => [index().on(table.userId)]
)

export const accounts = snakeCase.table(
  'accounts',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps
  },
  (table) => [index().on(table.userId)]
)

export const verifications = snakeCase.table(
  'verifications',
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps
  },
  (table) => [index().on(table.identifier)]
)

export const classes = snakeCase.table(
  'classes',
  {
    id: uuid().primaryKey().defaultRandom(),
    teacherId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text(),
    joinCode: text().notNull().unique(),
    joinCodeEnabled: boolean().notNull().default(true),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [index().on(table.teacherId)]
)

export const enrollments = snakeCase.table(
  'enrollments',
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    classId: uuid()
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    endedAt: timestamp({ withTimezone: true }),
    // Cached from `ledger_entries`, written only in the transaction that inserts an entry (#13)
    xp: integer().notNull().default(0),
    hp: integer().notNull().default(HP_MAX),
    coins: integer().notNull().default(0),
    ...timestamps
  },
  (table) => [
    unique().on(table.studentId, table.classId),
    index().on(table.classId),
    check('enrollments_xp_check', sql`${table.xp} >= 0`),
    check(
      'enrollments_hp_check',
      sql`${table.hp} between 0 and ${sql.raw(String(HP_MAX))}`
    ),
    check('enrollments_coins_check', sql`${table.coins} >= 0`)
  ]
)

// Never updated or deleted: a correction is a new entry (#16). The deltas are the ones applied after
// clamping, so reversing an entry restores the balances exactly
export const ledgerEntries = snakeCase.table(
  'ledger_entries',
  {
    id: uuid().primaryKey().defaultRandom(),
    enrollmentId: uuid()
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    type: text({ enum: LEDGER_ENTRY_TYPES }).notNull(),
    xpDelta: integer().notNull(),
    hpDelta: integer().notNull(),
    coinDelta: integer().notNull(),
    // No foreign key, since it points to a behavior, reward or power depending on `type`
    sourceId: uuid(),
    parentEntryId: uuid().references((): AnyPgColumn => ledgerEntries.id, {
      onDelete: 'cascade'
    }),
    createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index().on(table.enrollmentId, table.createdAt),
    index().on(table.parentEntryId)
  ]
)

// One row per student instead of one per attempt, so the table doesn't grow with each attempt (#58)
export const joinAttempts = snakeCase.table('join_attempts', {
  studentId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  windowStartedAt: timestamp({ withTimezone: true }).notNull(),
  attempts: integer().notNull()
})

// Keyed by the email or username the user typed (trimmed, in lowercase), not by the account: an
// email without an account gets the same cooldown, so the answer doesn't reveal which ones exist (#43)
export const verificationResends = snakeCase.table('verification_resends', {
  identifier: text().primaryKey(),
  sentAt: timestamp({ withTimezone: true }).notNull()
})
