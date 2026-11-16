import { cn } from 'cn'
import Link from 'next/link'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'

// Kept focusable and in place at the ends of the list, or the focus would drop to the body when
// the link just followed stops existing
const PageLink = ({
  href,
  disabled,
  children
}: {
  href: string
  disabled: boolean
  children: string
}) => (
  <Link
    href={href}
    aria-disabled={disabled || undefined}
    className={cn(
      linkButtonVariants({ variant: 'outline' }),
      'aria-disabled:pointer-events-none aria-disabled:opacity-50'
    )}
  >
    {children}
  </Link>
)

type PageNavProps = {
  page: number
  hasNextPage: boolean
  hrefOf: (page: number) => string
}

export const PageNav = ({ page, hasNextPage, hrefOf }: PageNavProps) =>
  (page > 1 || hasNextPage) && (
    // The frame is drawn outside the links, so the row needs room for it
    <nav
      aria-label="Páginas"
      className="flex flex-wrap items-center gap-6 p-1.5"
    >
      <PageLink href={hrefOf(page > 1 ? page - 1 : page)} disabled={page <= 1}>
        Anterior
      </PageLink>
      <p className="text-xs leading-relaxed">Página {page}</p>
      <PageLink
        href={hrefOf(hasNextPage ? page + 1 : page)}
        disabled={!hasNextPage}
      >
        Próxima
      </PageLink>
    </nav>
  )
