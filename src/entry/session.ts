import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { DASHBOARD_PATHS, type UserRole } from '@/constants/user'
import { auth } from '@/infra/auth'

// One lookup per request, however many layouts, pages and actions ask for it
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
)

export const requireSession = async () => {
  const session = await getSession()
  if (!session) redirect('/entrar')
  // Otherwise typing a dashboard URL would skip the mandatory change of a temporary password
  if (session.user.mustChangePassword) redirect('/alterar-senha')
  return session
}

// Every page calls it, not only its layout: a layout doesn't re-render on client navigation nor
// stop the page below it from rendering
// (https://nextjs.org/docs/app/guides/authentication#layouts-and-auth-checks)
export const requireRole = async (role: UserRole) => {
  const session = await requireSession()
  if (session.user.role !== role) redirect(DASHBOARD_PATHS[session.user.role])
  return session
}
