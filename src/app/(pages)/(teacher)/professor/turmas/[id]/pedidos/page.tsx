import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { identifyStudent } from '@/app/(pages)/(teacher)/professor/turmas/[id]/identify-student'
import { requireRole } from '@/entry/session'
import { powerRequestModel } from '@/models/power-request/model'

import { approvePowerRequest, refusePowerRequest } from './_components/action'
import { RequestList } from './_components/request-list'

export const metadata: Metadata = { title: 'Pedidos de poderes' }

// Formatted here with a fixed zone: the server runs in UTC and teachers are in Brazil
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
})

const PowerRequestsPage = async ({
  params
}: PageProps<'/professor/turmas/[id]/pedidos'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('teacher')
  const listed = await powerRequestModel.listPending(user.id, classId)
  if (!listed) notFound()
  const { schoolClass, requests } = listed

  return (
    <>
      <Link
        href={`/professor/turmas/${classId}`}
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar à turma
      </Link>
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-sm leading-relaxed">Pedidos de poderes</h1>
        <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {schoolClass.name}
        </p>
      </header>
      <RequestList
        requests={requests.map((request) => ({
          id: request.id,
          powerName: request.powerName,
          cost: request.cost,
          date: dateFormat.format(request.createdAt),
          studentLabel: identifyStudent(
            request.studentName,
            request.studentDetail
          )
        }))}
        approveAction={approvePowerRequest.bind(null, classId)}
        refuseAction={refusePowerRequest.bind(null, classId)}
      />
    </>
  )
}

export default PowerRequestsPage
