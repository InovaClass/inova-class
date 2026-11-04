import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

import { InviteStudentsForm } from './_components/invite-students-form'

export const metadata: Metadata = { title: 'Convidar alunos' }

const InviteStudentsPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/alunos/novo'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Convidar alunos"
        description={`Cada aluno recebe por e-mail um convite para a turma ${schoolClass.name}.`}
        footer={
          <Link
            href={`/professor/turmas/${classId}`}
            className="underline underline-offset-4"
          >
            Voltar à turma
          </Link>
        }
      >
        <InviteStudentsForm classId={classId} />
      </FormCard>
    </div>
  )
}

export default InviteStudentsPage
