import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PowerForm } from '@/app/(pages)/(teacher)/_components/power-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { powerModel } from '@/models/power/model'

import { updatePower } from './_components/action'

export const metadata: Metadata = { title: 'Editar poder' }

const EditPowerPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/poderes/[power-id]/editar'>) => {
  const { id: classId, 'power-id': powerId } = await params
  const { user } = await requireRole('teacher')
  const power = await powerModel.findOwned(user.id, classId, powerId)
  if (!power) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Editar poder"
        description="A mudança vale para os próximos usos do poder."
        footer={
          <Link
            href={`/professor/turmas/${classId}/poderes`}
            className="underline underline-offset-4"
          >
            Voltar aos poderes
          </Link>
        }
      >
        <PowerForm
          defaultValues={{
            characterClass: power.characterClass,
            name: power.name,
            description: power.description ?? '',
            cost: String(power.cost),
            minLevel: String(power.minLevel)
          }}
          action={updatePower.bind(null, classId, powerId)}
          submitLabel="Salvar"
          submitPendingLabel="Salvando"
        />
      </FormCard>
    </div>
  )
}

export default EditPowerPage
