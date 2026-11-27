import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { RewardForm } from '@/app/(pages)/(teacher)/_components/reward-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

import { createReward } from './_components/action'

export const metadata: Metadata = { title: 'Nova recompensa' }

const NewRewardPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/recompensas/nova'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Nova recompensa"
        description="Os alunos compram a recompensa com moedas, e você entrega na sala."
        footer={
          <Link
            href={`/professor/turmas/${classId}/recompensas`}
            className="underline underline-offset-4"
          >
            Voltar às recompensas
          </Link>
        }
      >
        <RewardForm
          action={createReward.bind(null, classId)}
          submitLabel="Criar recompensa"
          submitPendingLabel="Criando"
        />
      </FormCard>
    </div>
  )
}

export default NewRewardPage
