import type { Metadata } from 'next'

import { DeleteAccountSection } from '@/app/components/blocks/account/delete-account-section'
import { requireRole } from '@/entry/session'
import { accountModel } from '@/models/account/model'

export const metadata: Metadata = { title: 'Minha conta' }

const StudentAccountPage = async () => {
  const { user } = await requireRole('student')
  const summary = await accountModel.deletionSummary(user)

  return (
    <>
      <h1 className="text-sm leading-relaxed">Minha conta</h1>
      <DeleteAccountSection role="student" summary={summary} />
    </>
  )
}

export default StudentAccountPage
