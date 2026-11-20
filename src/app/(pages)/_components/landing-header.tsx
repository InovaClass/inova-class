import Link from 'next/link'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'

export const LandingHeader = () => (
  <header className="flex flex-wrap items-center justify-end gap-6 border-b-4 border-foreground p-4 dark:border-ring">
    <p className="mr-auto text-xs">inova.class</p>
    <Link href="/entrar" className={linkButtonVariants({ variant: 'outline' })}>
      Entrar
    </Link>
  </header>
)
