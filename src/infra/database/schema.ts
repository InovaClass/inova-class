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
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'

import {
  HP_MAX,
  LEDGER_ENTRY_TYPES,
  POWER_REQUEST_STATUSES,
  REWARD_ORDER_STATUSES
} from '@/constants/game'
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
    rankingVisible: boolean().notNull().default(false),
    itemShopEnabled: boolean().notNull().default(true),
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
    // Empty until the student picks the character. The values are validated against the sprite
    // manifest in `characterModel`, which an import can change, so the database doesn't list them
    characterClass: text(),
    bodyType: text(),
    skin: text(),
    hairStyle: text(),
    hairColor: text(),
    outfitColor: text(),
    equippedItems: text().array().notNull().default([]),
    ...timestamps
  },
  (table) => [
    unique().on(table.studentId, table.classId),
    // `hair_style` stays out: an empty one is a character without hair
    check(
      'enrollments_character_check',
      sql`(${table.characterClass} is null and ${table.bodyType} is null and ${table.skin} is null and ${table.hairStyle} is null and ${table.hairColor} is null and ${table.outfitColor} is null) or (${table.characterClass} is not null and ${table.bodyType} is not null and ${table.skin} is not null and ${table.hairColor} is not null and ${table.outfitColor} is not null)`
    ),
    index().on(table.classId),
    check('enrollments_xp_check', sql`${table.xp} >= 0`),
    check(
      'enrollments_hp_check',
      sql`${table.hp} between 0 and ${sql.raw(String(HP_MAX))}`
    ),
    check('enrollments_coins_check', sql`${table.coins} >= 0`)
  ]
)

// Removing one sets `removedAt`, since ledger entries keep pointing to it through `sourceId`
export const behaviors = snakeCase.table(
  'behaviors',
  {
    id: uuid().primaryKey().defaultRandom(),
    classId: uuid()
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    xp: integer().notNull(),
    hp: integer().notNull(),
    coins: integer().notNull(),
    removedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index().on(table.classId),
    check('behaviors_xp_check', sql`${table.xp} >= 0`),
    check(
      'behaviors_values_check',
      sql`${table.xp} <> 0 or ${table.hp} <> 0 or ${table.coins} <> 0`
    )
  ]
)

// Removing one sets `removedAt`, since ledger entries keep pointing to it through `sourceId`
export const consequences = snakeCase.table(
  'consequences',
  {
    id: uuid().primaryKey().defaultRandom(),
    classId: uuid()
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    removedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [index().on(table.classId)]
)

// `characterClass` is validated against the sprite manifest in the power schema, as on `enrollments`.
// Disabling one hides it from the students and keeps it listed for the teacher; removing one sets
// `removedAt`, since ledger entries keep pointing to it through `sourceId`
export const powers = snakeCase.table(
  'powers',
  {
    id: uuid().primaryKey().defaultRandom(),
    classId: uuid()
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    characterClass: text().notNull(),
    name: text().notNull(),
    description: text(),
    cost: integer().notNull(),
    minLevel: integer().notNull().default(1),
    disabledAt: timestamp({ withTimezone: true }),
    removedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index().on(table.classId, table.characterClass),
    check('powers_cost_check', sql`${table.cost} > 0`),
    check('powers_min_level_check', sql`${table.minLevel} >= 1`)
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
    // No foreign key, since it points to a behavior, consequence, power, reward or owned item depending
    // on `type`
    sourceId: uuid(),
    parentEntryId: uuid().references((): AnyPgColumn => ledgerEntries.id, {
      onDelete: 'cascade'
    }),
    // Groups the entries of one award to several students, so they're undone together
    batchId: uuid(),
    // Unique so that no entry can be reversed twice, even by concurrent requests
    reversedEntryId: uuid()
      .unique()
      .references((): AnyPgColumn => ledgerEntries.id, { onDelete: 'cascade' }),
    createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index().on(table.enrollmentId, table.createdAt),
    index().on(table.parentEntryId),
    index().on(table.batchId)
  ]
)

// `cost` is copied from the power, so editing the power never changes what a pending request holds.
// A pending request reserves its cost from the coins of the enrollment until the teacher decides (#20)
export const powerRequests = snakeCase.table(
  'power_requests',
  {
    id: uuid().primaryKey().defaultRandom(),
    enrollmentId: uuid()
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    powerId: uuid()
      .notNull()
      .references(() => powers.id, { onDelete: 'cascade' }),
    cost: integer().notNull(),
    status: text({ enum: POWER_REQUEST_STATUSES }).notNull().default('pending'),
    ledgerEntryId: uuid().references(() => ledgerEntries.id, {
      onDelete: 'cascade'
    }),
    decidedById: uuid().references(() => users.id, { onDelete: 'set null' }),
    decidedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index().on(table.enrollmentId, table.status),
    // A second click on the same power never reserves its cost twice
    uniqueIndex()
      .on(table.enrollmentId, table.powerId)
      .where(sql`${table.status} = 'pending'`),
    check('power_requests_cost_check', sql`${table.cost} > 0`),
    check(
      'power_requests_ledger_entry_check',
      sql`(${table.status} = 'approved') = (${table.ledgerEntryId} is not null)`
    )
  ]
)

// `stock` is empty for a reward without a limit. Removing one sets `removedAt`, since ledger entries
// and orders keep pointing to it
export const rewards = snakeCase.table(
  'rewards',
  {
    id: uuid().primaryKey().defaultRandom(),
    classId: uuid()
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text(),
    price: integer().notNull(),
    stock: integer(),
    removedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index().on(table.classId),
    check('rewards_price_check', sql`${table.price} > 0`),
    check('rewards_stock_check', sql`${table.stock} >= 0`)
  ]
)

// The coins leave at the purchase (#21), so `price` is copied from the reward and a cancellation
// refunds exactly what was paid, even after the teacher edits the reward
export const rewardOrders = snakeCase.table(
  'reward_orders',
  {
    id: uuid().primaryKey().defaultRandom(),
    enrollmentId: uuid()
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    rewardId: uuid()
      .notNull()
      .references(() => rewards.id, { onDelete: 'cascade' }),
    price: integer().notNull(),
    status: text({ enum: REWARD_ORDER_STATUSES }).notNull().default('pending'),
    purchaseEntryId: uuid()
      .notNull()
      .references(() => ledgerEntries.id, { onDelete: 'cascade' }),
    refundEntryId: uuid().references(() => ledgerEntries.id, {
      onDelete: 'cascade'
    }),
    decidedById: uuid().references(() => users.id, { onDelete: 'set null' }),
    decidedAt: timestamp({ withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index().on(table.enrollmentId, table.status),
    check('reward_orders_price_check', sql`${table.price} > 0`),
    check(
      'reward_orders_refund_entry_check',
      sql`(${table.status} = 'canceled') = (${table.refundEntryId} is not null)`
    )
  ]
)

// On the account, not the enrollment: an item bought once is used in any class (#32). `itemId` is
// validated against the catalog in `itemModel`, which an import can change, so the database doesn't
// list it. The entry goes to null rather than taking the item with it, since the item outlives the
// class it was bought in
export const ownedItems = snakeCase.table(
  'owned_items',
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: text().notNull(),
    purchaseEntryId: uuid().references(() => ledgerEntries.id, {
      onDelete: 'set null'
    }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [unique().on(table.studentId, table.itemId)]
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
