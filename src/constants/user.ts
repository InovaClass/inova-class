export const USER_ROLES = ['teacher', 'student'] as const

export type UserRole = (typeof USER_ROLES)[number]

export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_MAX_LENGTH = 128

export const USERNAME_MIN_LENGTH = 3

export const USERNAME_MAX_LENGTH = 30

export const USERNAME_PATTERN = /^[a-z0-9_.]+$/
