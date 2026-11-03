import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ClassForm } from '@/app/(pages)/(teacher)/_components/class-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

import { updateClass } from './_components/action'

export const metadata: Metadata = { title: 'Editar turma' }

const EditClassPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/editar'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Editar turma"
        description="Altere o nome ou a descrição da turma."
        footer={
          <Link
            href={`/professor/turmas/${classId}`}
            className="underline underline-offset-4"
          >
            Voltar à turma
          </Link>
        }
      >
        <ClassForm
          defaultValues={{
            name: schoolClass.name,
            description: schoolClass.description ?? ''
          }}
          action={updateClass.bind(null, classId)}
          submitLabel="Salvar"
        />
      </FormCard>
    </div>
  )
}

export default EditClassPage
