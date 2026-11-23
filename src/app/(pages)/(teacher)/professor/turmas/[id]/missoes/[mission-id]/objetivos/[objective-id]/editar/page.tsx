import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ObjectiveForm } from '@/app/(pages)/(teacher)/_components/objective-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { missionModel } from '@/models/mission/model'

import { updateObjective } from './_components/action'

export const metadata: Metadata = { title: 'Editar objetivo' }

// Blank rather than `0`, as the form starts: blank counts as zero
const blankIfZero = (value: number) => (value === 0 ? '' : String(value))

const EditObjectivePage = async ({
  params
}: PageProps<'/professor/turmas/[id]/missoes/[mission-id]/objetivos/[objective-id]/editar'>) => {
  const {
    id: classId,
    'mission-id': missionId,
    'objective-id': objectiveId
  } = await params
  const { user } = await requireRole('teacher')
  const objective = await missionModel.findObjective(
    user.id,
    classId,
    missionId,
    objectiveId
  )
  if (!objective) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Editar objetivo"
        description="A posição do objetivo na missão fica como está."
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
          defaultValues={{
            name: objective.name,
            story: objective.story,
            dueOn: objective.dueOn ?? '',
            xpReward: blankIfZero(objective.xpReward),
            coinReward: blankIfZero(objective.coinReward),
            latePenaltyCoins: blankIfZero(objective.latePenaltyCoins),
            latePenaltyHp: blankIfZero(objective.latePenaltyHp)
          }}
          action={updateObjective.bind(null, classId, missionId, objectiveId)}
          submitLabel="Salvar"
        />
      </FormCard>
    </div>
  )
}

export default EditObjectivePage
