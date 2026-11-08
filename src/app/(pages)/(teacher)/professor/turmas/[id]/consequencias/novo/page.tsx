import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ConsequenceForm } from '@/app/(pages)/(teacher)/_components/consequence-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

import { createConsequence } from './_components/action'

export const metadata: Metadata = { title: 'Nova consequência' }

const NewConsequencePage = async ({
  params
}: PageProps<'/professor/turmas/[id]/consequencias/novo'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Nova consequência"
        description="Ela entra no sorteio de quem ficar sem HP."
        footer={
          <Link
            href={`/professor/turmas/${classId}/consequencias`}
            className="underline underline-offset-4"
          >
            Voltar às consequências
          </Link>
        }
      >
        <ConsequenceForm
          action={createConsequence.bind(null, classId)}
          submitLabel="Criar consequência"
        />
      </FormCard>
    </div>
  )
}

export default NewConsequencePage
