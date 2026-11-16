// Ported from 8bitcn's leaderboard block (MIT, https://www.8bitcn.com/docs/blocks/leaderboard)
import { cva } from 'class-variance-authority'

import { Badge } from '@/app/components/ui/8bit/badge'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { Empty, EmptyHeader, EmptyTitle } from '@/app/components/ui/8bit/empty'
import { CharacterAvatar } from '@/app/components/ui/custom/character-avatar'
import { LevelBadge } from '@/app/components/ui/custom/level-badge'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { AvatarLook } from '@/models/avatar/layers'

export type LeaderboardPlayer = {
  key: string
  position: number
  name: string
  detail?: string | null
  level: number
  xp: number
  look: AvatarLook | null
  isCurrentPlayer?: boolean
}

type LeaderboardProps = {
  title: string
  players: LeaderboardPlayer[]
}

type Podium = 'default' | 'first' | 'second' | 'third'

// Upstream colors the podium with the theme's primary, secondary and accent, which our neutral base
// makes almost identical, so it takes the medal colors of upstream's scores instead
const playerItemVariants = cva('flex flex-wrap items-center gap-4 p-3', {
  variants: {
    podium: {
      default: 'bg-muted/50',
      first: 'border-2 border-yellow-500 bg-muted/50',
      second: 'border-2 border-neutral-400 bg-muted/50',
      third: 'border-2 border-amber-700 bg-muted/50'
    },
    // Apart from the podium, so a student in 5th place doesn't look like the one in 1st
    isCurrentPlayer: {
      true: 'outline-2 outline-offset-2 outline-primary outline-dashed',
      false: ''
    }
  },
  defaultVariants: { podium: 'default', isCurrentPlayer: false }
})

// neutral-950 on the lighter medals, since the theme's foreground flips with it
const rankBadgeVariants = cva(
  'flex size-8 shrink-0 items-center justify-center text-xs',
  {
    variants: {
      podium: {
        default: 'bg-muted text-muted-foreground',
        first: 'bg-yellow-500 text-neutral-950',
        second: 'bg-neutral-400 text-neutral-950',
        third: 'bg-amber-700 text-neutral-50'
      }
    },
    defaultVariants: { podium: 'default' }
  }
)

const podiumOf = (position: number): Podium => {
  if (position === 1) return 'first'
  if (position === 2) return 'second'
  if (position === 3) return 'third'
  return 'default'
}

export const Leaderboard = ({ title, players }: LeaderboardProps) => (
  <Card data-slot="leaderboard">
    <CardHeader>
      <CardTitle>
        <h2 className="text-sm leading-relaxed">{title}</h2>
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-5">
      {players.length === 0 ? (
        <Empty className="p-0 md:p-0">
          <EmptyHeader>
            <EmptyTitle className="text-sm leading-relaxed">
              Nenhum aluno na turma
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        // Tailwind's `list-style: none` makes Safari drop the list semantics
        <ol role="list" className="flex flex-col gap-2">
          {players.map((player) => {
            const podium = podiumOf(player.position)
            return (
              <li
                key={player.key}
                className={playerItemVariants({
                  podium,
                  isCurrentPlayer: Boolean(player.isCurrentPlayer)
                })}
              >
                <span
                  aria-hidden="true"
                  className={rankBadgeVariants({ podium })}
                >
                  {player.position}
                </span>
                <span className="sr-only">{player.position}º lugar:</span>
                {player.look ? (
                  <CharacterAvatar look={player.look} scale={1} still />
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-16 shrink-0 border-2 border-dashed border-border"
                  />
                )}
                <div className="flex min-w-0 flex-1 basis-40 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="text-xs leading-relaxed wrap-anywhere">
                      {player.name}
                    </p>
                    {player.isCurrentPlayer && (
                      <Badge className="text-xs">Você</Badge>
                    )}
                  </div>
                  {player.detail && (
                    <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
                      {player.detail}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <LevelBadge level={player.level} />
                  <p className="text-xs leading-relaxed">{player.xp} XP</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </CardContent>
  </Card>
)
