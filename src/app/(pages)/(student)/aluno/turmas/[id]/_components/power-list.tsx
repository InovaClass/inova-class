import { cn } from 'cn'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { CoinCounter } from '@/app/components/ui/custom/coin-counter'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'

type PowerListProps = {
  powers: {
    id: string
    name: string
    description: string | null
    cost: number
    minLevel: number
    unlocked: boolean
  }[]
}

export const PowerList = ({ powers }: PowerListProps) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2 className="text-sm leading-relaxed">Poderes</h2>
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-6">
      {powers.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Sua classe ainda não tem poderes nesta turma.
        </p>
      ) : (
        // Tailwind's `list-style: none` makes Safari drop the list semantics
        <ul role="list" className="flex flex-col gap-6">
          {powers.map((power) => (
            <li key={power.id} className="flex flex-col gap-2">
              <p
                className={cn(
                  'text-xs leading-relaxed wrap-anywhere',
                  !power.unlocked && 'text-muted-foreground'
                )}
              >
                {power.name}
              </p>
              {power.description && (
                <p className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">
                  {power.description}
                </p>
              )}
              <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-relaxed text-muted-foreground">
                <CoinCounter value={power.cost} />
                <span className={cn(power.unlocked && 'text-foreground')}>
                  {power.unlocked
                    ? 'Disponível'
                    : `Disponível a partir do nível ${power.minLevel}`}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
)
