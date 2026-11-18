import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import { rewardModel } from '@/models/reward/model'

import { removeReward, setItemShopEnabled } from './_components/action'
import { ItemShopToggle } from './_components/item-shop-toggle'
import { RewardList } from './_components/reward-list'

export const metadata: Metadata = { title: 'Recompensas' }

const RewardsPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/recompensas'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()
  const rewards = await rewardModel.list(user.id, classId)

  return (
    <>
      <Link
        href={`/professor/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
          <h1 className="text-sm leading-relaxed">Recompensas</h1>
          <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
            {schoolClass.name}
          </p>
        </div>
        {/* The frame is drawn outside the link, so it needs room for it */}
        <div className="p-1.5">
          <Link
            href={`/professor/turmas/${classId}/recompensas/nova`}
            className={linkButtonVariants({ variant: 'outline' })}
          >
            Nova recompensa
          </Link>
        </div>
      </header>
      <RewardList
        classId={classId}
        rewards={rewards}
        removeAction={removeReward.bind(null, classId)}
      />
      <ItemShopToggle
        enabled={schoolClass.itemShopEnabled}
        toggleAction={setItemShopEnabled.bind(
          null,
          classId,
          !schoolClass.itemShopEnabled
        )}
      />
    </>
  )
}

export default RewardsPage
