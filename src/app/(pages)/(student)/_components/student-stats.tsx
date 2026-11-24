import { StatsAvatar } from '@/app/components/blocks/class/stats-avatar'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { HealthBar } from '@/app/components/ui/8bit/health-bar'
import { XpBar } from '@/app/components/ui/8bit/xp-bar'
import { CoinCounter } from '@/app/components/ui/custom/coin-counter'
import { LevelBadge } from '@/app/components/ui/custom/level-badge'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import { HP_MAX } from '@/constants/game'
import type { AvatarLook } from '@/models/avatar/layers'
import { CHARACTER_CLASS_NAMES } from '@/models/character/constants'

type StudentStatsProps = {
  look: AvatarLook | null
  progress: { level: number; current: number; max: number }
  hp: number
  coins: number
}

export const StudentStats = ({
  look,
  progress,
  hp,
  coins
}: StudentStatsProps) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2 className="text-sm leading-relaxed">Seu progresso</h2>
      </CardTitle>
    </CardHeader>
    <CardContent className="relative flex flex-wrap items-center gap-6">
      <StatsAvatar
        look={look}
        stats={{ progress, hp, coins }}
        scale={2}
        celebrate
      />
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-4">
        {look && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {CHARACTER_CLASS_NAMES[look.characterClass]}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <LevelBadge level={progress.level} />
          <CoinCounter value={coins} />
        </div>
        {hp === 0 && (
          <p className="text-xs leading-relaxed text-destructive">Sem HP</p>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <p aria-hidden="true" className="text-xs">
            XP {progress.current}/{progress.max}
          </p>
          <div className="p-1.5">
            <XpBar value={progress.current} max={progress.max} />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p aria-hidden="true" className="text-xs">
            HP {hp}/{HP_MAX}
          </p>
          <div className="p-1.5">
            <HealthBar value={hp} />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)
