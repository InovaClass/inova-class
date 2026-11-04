import type { Metadata } from 'next'
import Link from 'next/link'

import { Card } from '@/app/components/ui/8bit/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { CardContent } from '@/app/components/ui/shadcn/card'
import { requireRole } from '@/entry/session'
import { classModel } from '@/models/class/model'

import { restoreClass } from './_components/action'
import { RestoreClassForm } from './_components/restore-class-form'

export const metadata: Metadata = { title: 'Turmas arquivadas' }

const ArchivedClassesPage = async () => {
  const { user } = await requireRole('teacher')
  const classes = await classModel.listArchived(user.id)

  return (
    <>
      <Link
        href="/professor"
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar ao painel
      </Link>
      <h1 className="text-sm leading-relaxed">Turmas arquivadas</h1>
      {classes.length > 0 ? (
        <Card>
          <CardContent>
            {/* Tailwind's `list-style: none` makes Safari drop the list semantics */}
            <ul role="list" className="flex flex-col gap-6">
              {classes.map(({ id, name, description }) => (
                <li key={id} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xs leading-relaxed font-medium wrap-anywhere">
                      {name}
                    </h2>
                    {description && (
                      <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                  <RestoreClassForm
                    name={name}
                    action={restoreClass.bind(null, id)}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              <h2 className="text-sm leading-relaxed">
                Nenhuma turma arquivada
              </h2>
            </EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              As turmas que você arquivar aparecem aqui.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  )
}

export default ArchivedClassesPage
