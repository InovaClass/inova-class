import { z } from 'zod'

import { LEDGER_ENTRY_TYPES } from '@/constants/game'

export const ledgerEntrySchema = z
  .object({
    enrollmentId: z.uuid(),
    // A level bonus only comes from the entry that crossed the level
    type: z.enum(LEDGER_ENTRY_TYPES).exclude(['level_bonus']),
    xpDelta: z.int(),
    hpDelta: z.int(),
    coinDelta: z.int(),
    sourceId: z.uuid().optional(),
    createdById: z.uuid().optional(),
    // A purchase is refused without enough coins, while a penalty only takes what there is
    requireCoins: z.boolean().default(false)
  })
  .refine(({ type, xpDelta }) => type === 'reversal' || xpDelta >= 0, {
    path: ['xpDelta'],
    message: 'O XP só diminui no estorno de um lançamento.'
  })
export type LedgerEntryInput = z.input<typeof ledgerEntrySchema>

export const historyPageSchema = z.coerce.number().pipe(z.int().positive())
