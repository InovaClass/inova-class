'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const AccountLink = ({ href }: { href: string }) => (
  <Link
    href={href}
    aria-current={usePathname() === href ? 'page' : undefined}
    className="text-xs underline-offset-4 hover:underline aria-[current=page]:underline"
  >
    Minha conta
  </Link>
)
