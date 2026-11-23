export const CLASS_EVENT_TYPES = [
  'ledger',
  'power-request',
  'reward-order',
  'mission'
] as const

export type ClassEventType = (typeof CLASS_EVENT_TYPES)[number]
