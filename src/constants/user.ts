export const USER_ROLES = ['teacher', 'student'] as const

export type UserRole = (typeof USER_ROLES)[number]

export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_MAX_LENGTH = 128
