import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { MissionForm } from '@/app/(pages)/(teacher)/_components/mission-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { missionModel } from '@/models/mission/model'

import { updateMission } from './_components/action'

export const metadata: Metadata = { title: 'Editar missão' }

const EditMissionPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/missoes/[mission-id]/editar'>) => {
  const { id: classId, 'mission-id': missionId } = await params
  const { user } = await requireRole('teacher')
  const mission = await missionModel.findOwned(user.id, classId, missionId)
  if (!mission) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Editar missão"
        description="Os objetivos da missão ficam como estão."
        footer={
          <Link
            href={`/professor/turmas/${classId}/missoes`}
            className="underline underline-offset-4"
          >
            Voltar às missões
          </Link>
        }
      >
        <MissionForm
          defaultValues={{
            name: mission.name,
            description: mission.description ?? '',
            map: mission.map
          }}
          action={updateMission.bind(null, classId, missionId)}
          submitLabel="Salvar"
        />
      </FormCard>
    </div>
  )
}

export default EditMissionPage
