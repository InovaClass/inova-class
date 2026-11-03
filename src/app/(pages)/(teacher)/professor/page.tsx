import type { Metadata } from 'next'

import { requireRole } from '@/entry/session'

export const metadata: Metadata = { title: 'Painel do professor' }

const TeacherDashboardPage = async () => {
  await requireRole('teacher')

  return (
    <>
      <h1 className="text-sm leading-relaxed">Painel do professor</h1>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Suas turmas aparecerão aqui.
      </p>
    </>
  )
}

export default TeacherDashboardPage
