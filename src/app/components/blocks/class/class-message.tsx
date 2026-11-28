// Ported from 8bitcn's dialogue block (MIT, https://www.8bitcn.com/docs/blocks/dialogue)
import { cn } from 'cn'
import type { ReactNode } from 'react'

import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/app/components/ui/8bit/alert'
import { Badge } from '@/app/components/ui/8bit/badge'
import { CharacterAvatar } from '@/app/components/ui/custom/character-avatar'
import type { AvatarLook } from '@/models/avatar/layers'

type ClassMessageProps = {
  author: { name: string; isTeacher: boolean; look: AvatarLook | null }
  body: string
  date: string
  // Upstream's `player`, inverted: the viewer's own messages sit on the right
  isOwn: boolean
  removedNotice?: string
  children?: ReactNode
}

// The teacher and a student without a character have no avatar, so the frame shows the initial, as
// upstream's fallback does
const AuthorAvatar = ({ author }: Pick<ClassMessageProps, 'author'>) =>
  author.look ? (
    <CharacterAvatar look={author.look} still scale={1} className="shrink-0" />
  ) : (
    <div
      aria-hidden="true"
      className="flex size-16 shrink-0 items-center justify-center border-2 border-dashed border-muted-foreground text-sm text-muted-foreground"
    >
      {author.name.trim().charAt(0).toUpperCase()}
    </div>
  )

export const ClassMessage = ({
  author,
  body,
  date,
  isOwn,
  removedNotice,
  children
}: ClassMessageProps) => (
  <div className={cn('flex items-start gap-4', isOwn && 'flex-row-reverse')}>
    <AuthorAvatar author={author} />
    {/* The frame is drawn outside the box, so it needs room for it */}
    <div className="min-w-0 flex-1 p-1.5">
      {/* Not a live alert: a board of them would read every message out on each refresh */}
      <Alert
        role={undefined}
        className={cn('mx-0', removedNotice && 'opacity-60')}
      >
        <AlertTitle className="line-clamp-none flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-relaxed">
          <span className="wrap-anywhere">{isOwn ? 'Você' : author.name}</span>
          {author.isTeacher && <Badge>Professor</Badge>}
          <span className="font-normal text-muted-foreground">{date}</span>
        </AlertTitle>
        <AlertDescription className="text-xs">
          <p className="wrap-anywhere whitespace-pre-wrap text-foreground">
            {body}
          </p>
          {removedNotice && (
            <p className="text-muted-foreground">{removedNotice}</p>
          )}
        </AlertDescription>
        {children && (
          // The frame is drawn outside the buttons, so the row needs room for it
          <div className="mt-4 flex flex-wrap gap-6 p-1.5">{children}</div>
        )}
      </Alert>
    </div>
  </div>
)
