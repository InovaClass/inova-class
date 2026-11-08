import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { ToastProvider } from '@/app/components/ui/8bit/toast'
import { requireRole } from '@/entry/session'
import { behaviorModel } from '@/models/behavior/model'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'

import {
  awardBehavior,
  regenerateJoinCode,
  removeStudent,
  setJoinCodeEnabled,
  undoAward
} from './_components/action'
import { ClassShell } from './_components/class-shell'
import { JoinCodePanel } from './_components/join-code-panel'
import { StudentRoster } from './_components/student-roster'

export const metadata: Metadata = { title: 'Turma' }

const ClassPage = async ({ params }: PageProps<'/professor/turmas/[id]'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()
  const [students, behaviors] = await Promise.all([
    enrollmentModel.listRoster(user.id, classId),
    behaviorModel.list(user.id, classId)
  ])

  return (
    <ClassShell schoolClass={schoolClass}>
      <ToastProvider>
        <StudentRoster
          classId={classId}
          students={students}
          behaviors={behaviors}
          awardAction={awardBehavior.bind(null, classId)}
          undoAction={undoAward.bind(null, classId)}
          removeAction={removeStudent.bind(null, classId)}
        />
      </ToastProvider>
      {/* The frame is drawn outside the link, so it needs room for it */}
      <div className="p-1.5">
        <Link
          href={`/professor/turmas/${classId}/alunos/novo`}
          className={linkButtonVariants({ variant: 'outline' })}
        >
          Convidar alunos
        </Link>
      </div>
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
    </ClassShell>
  )
}

export default ClassPage
