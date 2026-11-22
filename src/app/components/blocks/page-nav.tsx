import { cn } from 'cn'
import Link from 'next/link'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'

const PAGE_LINK_CLASSES = cn(
  linkButtonVariants({ variant: 'outline' }),
  'aria-disabled:pointer-events-none aria-disabled:opacity-50'
)

// Kept in place at the ends of the list, so the row doesn't shift. Without an `href`, since Enter on
// a disabled link would still reload the current page
const PageLink = ({
  href,
  disabled,
  children
}: {
  href: string
  disabled: boolean
  children: string
}) =>
  disabled ? (
    <span
      role="link"
      aria-disabled="true"
      tabIndex={0}
      className={PAGE_LINK_CLASSES}
    >
      {children}
    </span>
  ) : (
    <Link href={href} className={PAGE_LINK_CLASSES}>
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
      <PageLink href={hrefOf(page - 1)} disabled={page <= 1}>
        Anterior
      </PageLink>
      <p className="text-xs leading-relaxed">Página {page}</p>
      <PageLink href={hrefOf(page + 1)} disabled={!hasNextPage}>
        Próxima
      </PageLink>
    </nav>
  )
