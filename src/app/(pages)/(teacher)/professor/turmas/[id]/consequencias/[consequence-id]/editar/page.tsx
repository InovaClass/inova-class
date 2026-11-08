import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ConsequenceForm } from '@/app/(pages)/(teacher)/_components/consequence-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { consequenceModel } from '@/models/consequence/model'

import { updateConsequence } from './_components/action'

export const metadata: Metadata = { title: 'Editar consequência' }

const EditConsequencePage = async ({
  params
}: PageProps<'/professor/turmas/[id]/consequencias/[consequence-id]/editar'>) => {
  const { id: classId, 'consequence-id': consequenceId } = await params
  const { user } = await requireRole('teacher')
  const consequence = await consequenceModel.findOwned(
    user.id,
    classId,
    consequenceId
  )
  if (!consequence) notFound()

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Editar consequência"
        description="A mudança vale para os próximos sorteios."
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
          defaultValues={{ name: consequence.name }}
          action={updateConsequence.bind(null, classId, consequenceId)}
          submitLabel="Salvar"
        />
      </FormCard>
    </div>
  )
}

export default EditConsequencePage
