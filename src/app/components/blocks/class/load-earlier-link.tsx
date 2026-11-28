'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { linkButtonVariants } from '@/app/components/ui/8bit/button'

type LoadEarlierLinkProps = {
  href: string
  hasMore: boolean
}

export const LoadEarlierLink = ({ href, hasMore }: LoadEarlierLinkProps) => {
  const endOfBoard = useRef<HTMLParagraphElement>(null)
  const hadMore = useRef(hasMore)

  // The last page takes the link away with the focus on it, so the end of the board takes the focus
  // instead of the body. Only on that change: opening a page that is already the last one keeps it
  useEffect(() => {
    if (
      !hasMore &&
      hadMore.current &&
      document.activeElement === document.body
    ) {
      endOfBoard.current?.focus()
    }
    hadMore.current = hasMore
  }, [hasMore])

  return hasMore ? (
    // The frame is drawn outside the link, so it needs room for it
    <div className="p-1.5">
      <Link
        href={href}
        scroll={false}
        className={linkButtonVariants({ variant: 'outline' })}
      >
        Carregar anteriores
      </Link>
    </div>
  ) : (
    <p
      ref={endOfBoard}
      tabIndex={-1}
      className="text-xs leading-relaxed text-muted-foreground"
    >
      Não há mensagens anteriores.
    </p>
  )
}
