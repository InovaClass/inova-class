import {
  type AnyPgColumn,
  boolean,
  index,
  snakeCase,
  text,
  timestamp,
  unique,
  uuid
} from 'drizzle-orm/pg-core'

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
  mustChangePassword: boolean().notNull().default(false),
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
    ...timestamps
  },
  (table) => [
    unique().on(table.studentId, table.classId),
    index().on(table.classId)
  ]
)
