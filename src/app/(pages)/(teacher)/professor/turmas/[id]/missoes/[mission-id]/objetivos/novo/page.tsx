import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ObjectiveForm } from '@/app/(pages)/(teacher)/_components/objective-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { missionModel } from '@/models/mission/model'

import { createObjective } from './_components/action'

export const metadata: Metadata = { title: 'Novo objetivo' }

const NewObjectivePage = async ({
  params
}: PageProps<'/professor/turmas/[id]/missoes/[mission-id]/objetivos/novo'>) => {
  const { id: classId, 'mission-id': missionId } = await params
  const { user } = await requireRole('teacher')
  const mission = await missionModel.findOwned(user.id, classId, missionId)
  if (!mission) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Novo objetivo"
        description={`Entra depois do último objetivo de ${mission.name}.`}
        footer={
          <Link
            href={`/professor/turmas/${classId}/missoes/${missionId}`}
            className="underline underline-offset-4"
          >
            Voltar à missão
          </Link>
        }
      >
        <ObjectiveForm
          action={createObjective.bind(null, classId, missionId)}
          submitLabel="Criar objetivo"
        />
      </FormCard>
    </div>
  )
}

export default NewObjectivePage
