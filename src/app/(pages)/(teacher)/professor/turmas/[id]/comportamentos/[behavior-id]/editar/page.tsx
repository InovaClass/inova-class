import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BehaviorForm } from '@/app/(pages)/(teacher)/_components/behavior-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { behaviorModel } from '@/models/behavior/model'

import { updateBehavior } from './_components/action'

// Blank, as on the new behavior page, where a value that doesn't change is left out
const pointsOf = (value: number) => (value === 0 ? '' : value)

export const metadata: Metadata = { title: 'Editar comportamento' }

const EditBehaviorPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/comportamentos/[behavior-id]/editar'>) => {
  const { id: classId, 'behavior-id': behaviorId } = await params
  const { user } = await requireRole('teacher')
  const behavior = await behaviorModel.findOwned(user.id, classId, behaviorId)
  if (!behavior) notFound()
  const { name, xp, hp, coins } = behavior

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Editar comportamento"
        description="A mudança vale daqui em diante. Os pontos já dados ficam como estão."
        footer={
          <Link
            href={`/professor/turmas/${classId}/comportamentos`}
            className="underline underline-offset-4"
          >
            Voltar aos comportamentos
          </Link>
        }
      >
        <BehaviorForm
          defaultValues={{
            name,
            xp: pointsOf(xp),
            hp: pointsOf(hp),
            coins: pointsOf(coins)
          }}
          action={updateBehavior.bind(null, classId, behaviorId)}
          submitLabel="Salvar"
        />
      </FormCard>
    </div>
  )
}

export default EditBehaviorPage
