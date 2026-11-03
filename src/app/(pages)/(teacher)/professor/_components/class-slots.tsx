// Adapted from 8bitcn's save-slots block (MIT, https://www.8bitcn.com/docs/blocks/gaming/save-slots)
import Link from 'next/link'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'

type ClassSlotsProps = {
  classes: { id: string; name: string; description: string | null }[]
}

export const ClassSlots = ({ classes }: ClassSlotsProps) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2 className="text-center text-sm leading-relaxed">Suas turmas</h2>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map(({ id, name, description }) => (
          <li key={id} className="min-w-0">
            <Link
              href={`/professor/turmas/${id}`}
              className="flex h-full flex-col justify-center gap-2 overflow-hidden border-2 border-border bg-muted/30 p-4 transition-all duration-200 hover:border-primary hover:bg-accent/50"
            >
              {/* Not truncated: two names may differ only at the end, and nothing else tells them apart */}
              <h3 className="text-xs leading-relaxed font-medium wrap-anywhere">
                {name}
              </h3>
              {description && (
                <p className="truncate text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
)
