import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

import { ClassShell } from './_components/class-shell'

export const metadata: Metadata = { title: 'Turma' }

const ClassPage = async ({ params }: PageProps<'/professor/turmas/[id]'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()

  return (
    <ClassShell schoolClass={schoolClass}>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Os alunos desta turma aparecerão aqui.
      </p>
    </ClassShell>
  )
}

export default ClassPage
