import type { Metadata } from 'next'
import Link from 'next/link'

import { ClassForm } from '@/app/(pages)/(teacher)/_components/class-form'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'

import { createClass } from './_components/action'

export const metadata: Metadata = { title: 'Nova turma' }

const NewClassPage = async () => {
  await requireRole('teacher')

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Nova turma"
        description="Dê um nome para a turma e, se quiser, uma descrição."
        footer={
          <Link href="/professor" className="underline underline-offset-4">
            Voltar ao painel
          </Link>
        }
      >
        <ClassForm action={createClass} submitLabel="Criar turma" />
      </FormCard>
    </div>
  )
}

export default NewClassPage
