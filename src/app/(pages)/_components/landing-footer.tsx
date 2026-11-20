import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/termos', label: 'Termos de Uso' },
  { href: '/privacidade', label: 'Política de Privacidade' },
  { href: '/creditos', label: 'Créditos' }
] as const

export const LandingFooter = () => (
  <footer className="border-t-4 border-foreground p-4 dark:border-ring">
    <nav aria-label="Termos e créditos">
      <ul
        role="list"
        className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs"
      >
        {FOOTER_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="underline underline-offset-4">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  </footer>
)
