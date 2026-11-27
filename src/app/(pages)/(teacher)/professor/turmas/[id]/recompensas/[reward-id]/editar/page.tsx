import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { RewardForm } from '@/app/(pages)/(teacher)/_components/reward-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { rewardModel } from '@/models/reward/model'

import { updateReward } from './_components/action'

export const metadata: Metadata = { title: 'Editar recompensa' }

const EditRewardPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/recompensas/[reward-id]/editar'>) => {
  const { id: classId, 'reward-id': rewardId } = await params
  const { user } = await requireRole('teacher')
  const reward = await rewardModel.findOwned(user.id, classId, rewardId)
  if (!reward) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Editar recompensa"
        description="A mudança vale para as próximas compras. Os pedidos já feitos mantêm o preço pago."
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
          defaultValues={{
            name: reward.name,
            description: reward.description ?? '',
            price: String(reward.price),
            stock: reward.stock === null ? '' : String(reward.stock)
          }}
          action={updateReward.bind(null, classId, rewardId)}
          submitLabel="Salvar"
          submitPendingLabel="Salvando"
        />
      </FormCard>
    </div>
  )
}

export default EditRewardPage
