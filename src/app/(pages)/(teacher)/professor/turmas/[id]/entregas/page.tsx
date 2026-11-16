import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { identifyStudent } from '@/app/(pages)/(teacher)/professor/turmas/[id]/identify-student'
import { requireRole } from '@/entry/session'
import { rewardOrderModel } from '@/models/reward-order/model'

import { cancelRewardOrder, deliverRewardOrder } from './_components/action'
import { OrderList } from './_components/order-list'

export const metadata: Metadata = { title: 'Entregas de recompensas' }

// Formatted here with a fixed zone: the server runs in UTC and teachers are in Brazil
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
})

const RewardOrdersPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/entregas'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const listed = await rewardOrderModel.listPending(user.id, classId)
  if (!listed) notFound()
  const { schoolClass, orders } = listed

  return (
    <>
      <Link
        href={`/professor/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed">Entregas de recompensas</h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {schoolClass.name}
        </p>
      </header>
      <OrderList
        orders={orders.map((order) => ({
          id: order.id,
          rewardName: order.rewardName,
          price: order.price,
          date: dateFormat.format(order.createdAt),
          studentLabel: identifyStudent(order.studentName, order.studentDetail),
          studentLeft: order.studentLeft
        }))}
        deliverAction={deliverRewardOrder.bind(null, classId)}
        cancelAction={cancelRewardOrder.bind(null, classId)}
      />
    </>
  )
}

export default RewardOrdersPage
