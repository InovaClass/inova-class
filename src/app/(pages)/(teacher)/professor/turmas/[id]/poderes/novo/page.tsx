import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PowerForm } from '@/app/(pages)/(teacher)/_components/power-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

import { createPower } from './_components/action'

export const metadata: Metadata = { title: 'Novo poder' }

const NewPowerPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/poderes/novo'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Novo poder"
        description="Os alunos da classe escolhida compram o poder com moedas, a partir do nível mínimo."
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
          action={createPower.bind(null, classId)}
          submitLabel="Criar poder"
        />
      </FormCard>
    </div>
  )
}

export default NewPowerPage
