import Link from 'next/link'
import type { ReactNode } from 'react'

import {
  describeMissionProgress,
  missionPathOf
} from '@/app/(pages)/(student)/mission-links'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/app/components/ui/8bit/empty'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'

type MissionSummary = {
  id: string
  name: string
  description: string | null
  approvedCount: number
  objectiveCount: number
  currentObjective?: { id: string; name: string }
}

type MissionSummaryListProps = {
  classId: string
  title: string
  missions: MissionSummary[]
  showDescription?: boolean
  empty: { title: string; description: string }
  children?: ReactNode
}

export const MissionSummaryList = ({
  classId,
  title,
  missions,
  showDescription = false,
  empty,
  children
}: MissionSummaryListProps) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2 className="text-sm leading-relaxed">{title}</h2>
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-6">
      {missions.length === 0 ? (
        <Empty className="p-0 md:p-0">
          <EmptyHeader>
            <EmptyTitle className="text-sm leading-relaxed">
              {empty.title}
            </EmptyTitle>
            <EmptyDescription className="text-xs leading-relaxed">
              {empty.description}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // Tailwind's `list-style: none` makes Safari drop the list semantics
        <ul role="list" className="flex flex-col gap-6">
          {missions.map((mission) => {
            const current = mission.currentObjective
            return (
              <li
                key={mission.id}
                className="flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2 text-xs leading-relaxed">
                  <p className="wrap-anywhere">{mission.name}</p>
                  {showDescription && mission.description && (
                    <p className="wrap-anywhere text-muted-foreground">
                      {mission.description}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {describeMissionProgress(mission)}
                  </p>
                  <p className="wrap-anywhere text-muted-foreground">
                    {current
                      ? `Objetivo atual: ${current.name}`
                      : 'Missão concluída'}
                  </p>
                </div>
                {/* The frame is drawn outside the link, so it needs room for it */}
                <div className="p-1.5">
                  <Link
                    href={missionPathOf(classId, mission.id, current?.id)}
                    className={linkButtonVariants({ variant: 'outline' })}
                  >
                    {current ? 'Continuar' : 'Ver missão'}
                    <span className="sr-only"> {mission.name}</span>
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {children}
    </CardContent>
  </Card>
)
