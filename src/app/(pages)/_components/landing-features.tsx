// Adapted from 8bitcn's game-features1 block (MIT, https://www.8bitcn.com/docs/blocks/gaming/game-features1)
import type { ReactNode } from 'react'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { HealthBar } from '@/app/components/ui/8bit/health-bar'
import { XpBar } from '@/app/components/ui/8bit/xp-bar'
import { CoinCounter } from '@/app/components/ui/custom/coin-counter'
import { LevelBadge } from '@/app/components/ui/custom/level-badge'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'

type Feature = { title: string; description: string; sample: ReactNode }

const FEATURES: Feature[] = [
  {
    title: 'XP e nível',
    description:
      'Os comportamentos positivos dão XP. Ao subir de nível, o aluno ganha moedas e desbloqueia poderes.',
    sample: (
      <div className="flex items-center gap-4">
        <LevelBadge level={3} className="shrink-0" />
        <XpBar value={180} max={300} />
      </div>
    )
  },
  {
    title: 'HP',
    description:
      'Um comportamento negativo tira HP. Quem fica sem HP recebe uma consequência sorteada e volta com a vida cheia.',
    sample: <HealthBar value={20} />
  },
  {
    title: 'Moedas',
    description:
      'As moedas compram recompensas da turma, poderes da classe e itens para o personagem.',
    sample: <CoinCounter value={120} />
  }
]

export const LandingFeatures = () => (
  <section aria-labelledby="como-funciona" className="w-full px-4 py-16">
    <div className="mx-auto max-w-4xl">
      <div className="mb-10 text-center">
        <h2
          id="como-funciona"
          className="mb-3 text-xl leading-relaxed font-bold tracking-tight md:text-2xl"
        >
          Como funciona
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          O professor define os comportamentos e o jogo cuida da pontuação.
        </p>
      </div>

      <ul role="list" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ title, description, sample }) => (
          <li key={title}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>
                  <h3 className="text-sm leading-relaxed">{title}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
                {/* Decorative: a sample of what the class screens show */}
                <div aria-hidden="true">{sample}</div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  </section>
)
