// Adapted from 8bitcn's game-cta1 block (MIT, https://www.8bitcn.com/docs/blocks/gaming/game-cta1)
import Link from 'next/link'

import { SIGN_UP_LINKS } from '@/app/(pages)/sign-up-links'
import { Badge } from '@/app/components/ui/8bit/badge'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'

const ROLE_CARDS = [
  {
    badge: 'Professor',
    title: 'Mestre do jogo',
    link: SIGN_UP_LINKS.teacher,
    description:
      'Crie turmas, convide os alunos, registre os comportamentos com um clique e aprove o uso dos poderes.'
  },
  {
    badge: 'Aluno',
    title: 'Herói da turma',
    link: SIGN_UP_LINKS.student,
    description:
      'Entre na turma com o código do professor, escolha sua classe e acompanhe seu progresso.'
  }
] as const

export const LandingCta = () => (
  <section aria-labelledby="comece" className="w-full px-4 py-16">
    <div className="mx-auto max-w-3xl">
      <div className="mb-10 text-center">
        <h2
          id="comece"
          className="mb-3 text-xl leading-relaxed font-bold tracking-tight md:text-2xl"
        >
          Pronto para começar?
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Crie sua conta e prepare a primeira aventura.
        </p>
      </div>

      <ul role="list" className="grid gap-8 md:grid-cols-2">
        {ROLE_CARDS.map(({ badge, title, description, link }) => (
          <li key={badge}>
            <Card className="h-full">
              {/* The role comes after the title in the DOM, so a heading jump reads the title first */}
              <CardHeader className="flex flex-col-reverse items-start">
                <CardTitle className="mt-2">
                  <h3 className="text-sm leading-relaxed">{title}</h3>
                </CardTitle>
                <Badge>{badge}</Badge>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
                <Link
                  href={link.href}
                  className={linkButtonVariants({ variant: 'outline' })}
                >
                  {link.label}
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  </section>
)
