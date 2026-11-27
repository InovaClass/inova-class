import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { MissionForm } from '@/app/(pages)/(teacher)/_components/mission-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

import { createMission } from './_components/action'

export const metadata: Metadata = { title: 'Nova missão' }

const NewMissionPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/missoes/nova'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Nova missão"
        description="A missão começa como rascunho: crie os objetivos e publique quando estiver pronta."
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
          action={createMission.bind(null, classId)}
          submitLabel="Criar missão"
          submitPendingLabel="Criando"
        />
      </FormCard>
    </div>
  )
}

export default NewMissionPage
