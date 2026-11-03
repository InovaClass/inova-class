import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

import { regenerateJoinCode, setJoinCodeEnabled } from './_components/action'
import { ClassShell } from './_components/class-shell'
import { JoinCodePanel } from './_components/join-code-panel'

export const metadata: Metadata = { title: 'Turma' }

const ClassPage = async ({ params }: PageProps<'/professor/turmas/[id]'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()

  return (
    <ClassShell schoolClass={schoolClass}>
      <JoinCodePanel
        joinCode={schoolClass.joinCode}
        enabled={schoolClass.joinCodeEnabled}
        regenerateAction={regenerateJoinCode.bind(null, classId)}
        toggleAction={setJoinCodeEnabled.bind(
          null,
          classId,
          !schoolClass.joinCodeEnabled
        )}
      />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Os alunos desta turma aparecerão aqui.
      </p>
    </ClassShell>
  )
}

export default ClassPage
