import Link from 'next/link'
import type { ReactNode } from 'react'

import { ConfirmActionDialog } from '@/app/(pages)/(teacher)/_components/confirm-action-dialog'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'

import { archiveClass } from './action'

type ClassShellProps = {
  schoolClass: { id: string; name: string; description: string | null }
  children: ReactNode
}

// A component rather than a layout, since the edit page under this route doesn't use the shell
export const ClassShell = ({ schoolClass, children }: ClassShellProps) => (
  <>
    <Link
      href="/professor"
      className="w-fit text-xs underline underline-offset-4"
    >
      Voltar ao painel
    </Link>
    <header className="flex flex-wrap items-start justify-between gap-6">
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
        <h1 className="text-sm leading-relaxed wrap-anywhere">
          {schoolClass.name}
        </h1>
        {schoolClass.description && (
          <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
            {schoolClass.description}
          </p>
        )}
      </div>
      {/* The frame is drawn outside the buttons, so the row needs room for it */}
      <div className="flex flex-wrap gap-6 p-1.5">
        <Link
          href={`/professor/turmas/${schoolClass.id}/comportamentos`}
          className={linkButtonVariants({ variant: 'outline' })}
        >
          Comportamentos
        </Link>
        <Link
          href={`/professor/turmas/${schoolClass.id}/historico`}
          className={linkButtonVariants({ variant: 'outline' })}
        >
          Histórico
        </Link>
        <Link
          href={`/professor/turmas/${schoolClass.id}/editar`}
          className={linkButtonVariants({ variant: 'outline' })}
        >
          Editar
        </Link>
        <ConfirmActionDialog
          triggerLabel="Arquivar"
          title="Arquivar turma?"
          description={`${schoolClass.name} sairá do seu painel. Os dados da turma serão mantidos.`}
          confirmLabel="Arquivar"
          action={archiveClass.bind(null, schoolClass.id)}
        />
      </div>
    </header>
    {children}
  </>
)
