import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
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
      {/* The frame is drawn outside the link, so it needs room for it */}
      <div className="p-1.5">
        <Link
          href={`/professor/turmas/${classId}/alunos/novo`}
          className={linkButtonVariants({ variant: 'outline' })}
        >
          Convidar alunos
        </Link>
      </div>
    </ClassShell>
  )
}

export default ClassPage
