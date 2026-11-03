import { redirect } from 'next/navigation'

import { DASHBOARD_PATHS } from '@/constants/user'
import { requireSession } from '@/entry/session'

const RootPage = async () => {
  const { user } = await requireSession()
  redirect(DASHBOARD_PATHS[user.role])
}

export default RootPage
