// Adapted from 8bitcn's game-hero1 block (MIT, https://www.8bitcn.com/docs/blocks/gaming/game-hero1)
import Link from 'next/link'

import { SIGN_UP_LINKS } from '@/app/(pages)/sign-up-links'
import { Badge } from '@/app/components/ui/8bit/badge'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { XpBar } from '@/app/components/ui/8bit/xp-bar'

export const LandingHero = () => (
  <div className="relative w-full px-4 py-16 md:py-24">
    <div className="mx-auto max-w-2xl text-center">
      <div className="mb-6">
        <Badge>Sala de aula gamificada</Badge>
      </div>

      <h1 className="mb-4 text-2xl leading-relaxed font-bold tracking-tight md:text-4xl">
        Sua turma em uma aventura
      </h1>

      <p className="mx-auto mb-8 max-w-lg text-xs leading-relaxed text-muted-foreground">
        No inova.class, os alunos ganham XP pelo que fazem bem, perdem HP pelo
        que precisam melhorar e trocam moedas por recompensas que o professor
        escolhe.
      </p>

      <ul role="list" className="mb-12 flex flex-wrap justify-center gap-6">
        {Object.values(SIGN_UP_LINKS).map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={linkButtonVariants({ variant: 'outline', size: 'lg' })}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Decorative: a sample of the bar a student sees, not anyone's value */}
      <div aria-hidden="true" className="mx-auto max-w-sm">
        <div className="mb-2 flex justify-between text-xs">
          <span>XP até o próximo nível</span>
          <span>72%</span>
        </div>
        <XpBar className="h-3" value={72} max={100} />
      </div>
    </div>
  </div>
)
