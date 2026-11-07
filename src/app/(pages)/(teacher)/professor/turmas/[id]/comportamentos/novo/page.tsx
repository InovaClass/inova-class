import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BehaviorForm } from '@/app/(pages)/(teacher)/_components/behavior-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

import { createBehavior } from './_components/action'

export const metadata: Metadata = { title: 'Novo comportamento' }

const NewBehaviorPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/comportamentos/novo'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Novo comportamento"
        description="Um comportamento positivo dá XP, HP ou moedas, e um negativo tira HP ou moedas. Deixe em branco o que não muda."
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
          action={createBehavior.bind(null, classId)}
          submitLabel="Criar comportamento"
        />
      </FormCard>
    </div>
  )
}

export default NewBehaviorPage
