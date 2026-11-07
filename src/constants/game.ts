export const HP_MAX = 50

export const LEDGER_ENTRY_TYPES = [
  'behavior',
  'level_bonus',
  'reward_purchase',
  'reward_refund',
  'power',
  'hp_restore',
  'reversal'
] as const

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number]
