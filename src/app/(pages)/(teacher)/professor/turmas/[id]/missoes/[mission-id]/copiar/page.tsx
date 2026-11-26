import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { FormCard } from '@/app/components/ui/custom/form-card'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import { missionModel } from '@/models/mission/model'

import { copyMission } from './_components/action'
import { CopyMissionForm } from './_components/copy-mission-form'

export const metadata: Metadata = { title: 'Copiar missão' }

const CopyMissionPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/missoes/[mission-id]/copiar'>) => {
  const { id: classId, 'mission-id': missionId } = await params
  const { user } = await requireRole('teacher')
  const mission = await missionModel.findOwned(user.id, classId, missionId)
  if (!mission) notFound()
  const classes = await classModel.list(user.id)
  const otherClasses = classes.filter(({ id }) => id !== classId)

  return (
    <div className="mx-auto w-full max-w-md">
      <FormCard
        title="Copiar missão"
        description={`${mission.name}: a cópia chega à outra turma como rascunho, com os objetivos na mesma ordem e sem nenhuma entrega.`}
        footer={
          <Link
            href={`/professor/turmas/${classId}/missoes/${missionId}`}
            className="underline underline-offset-4"
          >
            Voltar à missão
          </Link>
        }
      >
        {otherClasses.length > 0 ? (
          <CopyMissionForm
            classes={otherClasses}
            action={copyMission.bind(null, classId, missionId)}
          />
        ) : (
          <Empty className="p-0 md:p-0">
            <EmptyHeader>
              <EmptyTitle className="text-sm leading-relaxed">
                Nenhuma outra turma
              </EmptyTitle>
              <EmptyDescription className="text-xs leading-relaxed">
                Você não tem outra turma ativa para receber a cópia.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                href="/professor/turmas/nova"
                className={linkButtonVariants({ variant: 'outline' })}
              >
                Nova turma
              </Link>
            </EmptyContent>
          </Empty>
        )}
      </FormCard>
    </div>
  )
}

export default CopyMissionPage
