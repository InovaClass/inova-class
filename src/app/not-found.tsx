import type { Metadata } from 'next'
import Link from 'next/link'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { StatusScreen } from '@/app/components/ui/custom/status-screen'

export const metadata: Metadata = { title: 'Página não encontrada' }

const NotFound = () => (
  <StatusScreen
    banner="404"
    title="Página não encontrada"
    description="Este caminho não leva a lugar nenhum. Volte ao início e siga por outra rota."
  >
    <Link href="/" className={linkButtonVariants({ variant: 'outline' })}>
      Voltar ao início
    </Link>
  </StatusScreen>
)

export default NotFound
