import { headers } from 'next/headers'
import { cache } from 'react'

import { auth } from '@/infra/auth'

// One lookup per request, however many layouts, pages and actions ask for it
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
)
