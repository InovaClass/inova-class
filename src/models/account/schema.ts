import { z } from 'zod'

// Imported by the client form too, so it must not import anything server-only

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Informe sua senha.')
})

export type DeleteAccountInput = z.input<typeof deleteAccountSchema>
