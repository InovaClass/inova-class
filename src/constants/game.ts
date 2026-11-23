export const HP_MAX = 50

export const LEDGER_ENTRY_TYPES = [
  'behavior',
  'level_bonus',
  'reward_purchase',
  'reward_refund',
  'item_purchase',
  'power',
  'hp_restore',
  'quest_reward',
  'quest_penalty',
  'reversal'
] as const

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number]

export const POWER_REQUEST_STATUSES = [
  'pending',
  'approved',
  'refused',
  'canceled'
] as const

export type PowerRequestStatus = (typeof POWER_REQUEST_STATUSES)[number]

export const REWARD_ORDER_STATUSES = [
  'pending',
  'delivered',
  'canceled'
] as const

export type RewardOrderStatus = (typeof REWARD_ORDER_STATUSES)[number]

export const OBJECTIVE_SUBMISSION_STATUSES = [
  'pending',
  'approved',
  'returned'
] as const

export type ObjectiveSubmissionStatus =
  (typeof OBJECTIVE_SUBMISSION_STATUSES)[number]
