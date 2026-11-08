import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { identifyStudent } from '@/app/(pages)/(teacher)/professor/turmas/[id]/identify-student'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import { consequenceModel } from '@/models/consequence/model'
import { enrollmentModel } from '@/models/enrollment/model'

import { drawConsequence } from './_components/action'
import { DrawPanel } from './_components/draw-panel'

export const metadata: Metadata = { title: 'Sorteio de consequência' }

const DrawPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/alunos/[student-id]/sorteio'>) => {
  const { id: classId, 'student-id': studentId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()
  const [students, consequences] = await Promise.all([
    enrollmentModel.listRoster(user.id, classId),
    consequenceModel.list(user.id, classId)
  ])
  const student = students.find(({ id }) => id === studentId)
  if (!student) notFound()

  return (
    <>
      <Link
        href={`/professor/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed">Sorteio de consequência</h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {schoolClass.name}
        </p>
      </header>
      <DrawPanel
        classId={classId}
        studentLabel={identifyStudent(
          student.name,
          student.email ?? student.username
        )}
        fallen={student.hp === 0}
        hasConsequences={consequences.length > 0}
        drawAction={drawConsequence.bind(null, classId, studentId)}
      />
    </>
  )
}

export default DrawPage
