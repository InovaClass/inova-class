import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'
import { powerModel } from '@/models/power/model'

import { removePower, setPowerEnabled } from './_components/action'
import { PowerList } from './_components/power-list'

export const metadata: Metadata = { title: 'Poderes' }

const PowersPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/poderes'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const schoolClass = await classModel.findOwned(user.id, classId)
  if (!schoolClass) notFound()
  const powers = await powerModel.list(user.id, classId)

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
          <h1 className="text-sm leading-relaxed">Poderes</h1>
          <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
            {schoolClass.name}
          </p>
        </div>
        {/* The frame is drawn outside the link, so it needs room for it */}
        <div className="p-1.5">
          <Link
            href={`/professor/turmas/${classId}/poderes/novo`}
            className={linkButtonVariants({ variant: 'outline' })}
          >
            Novo poder
          </Link>
        </div>
      </header>
      <PowerList
        classId={classId}
        powers={powers}
        setEnabledAction={setPowerEnabled.bind(null, classId)}
        removeAction={removePower.bind(null, classId)}
      />
    </>
  )
}

export default PowersPage
