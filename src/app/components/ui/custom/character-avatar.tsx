import { cn } from 'cn'
import type { ComponentProps, CSSProperties } from 'react'

import {
  type AvatarAnimation,
  avatarLayers,
  type AvatarLook
} from '@/models/avatar/layers'
import { AVATAR_MANIFEST } from '@/models/avatar/manifest'

type CharacterAvatarProps = Omit<ComponentProps<'div'>, 'children'> & {
  look: AvatarLook
  animation?: AvatarAnimation
  // An attack or a hurt answers a single event, so only idle loops by default
  loop?: boolean
  // The first frame only, for a list where many animated avatars would distract
  still?: boolean
  // Whole multiples only: a fractional one blurs the pixel art
  scale?: 1 | 2 | 3 | 4
}

export const CharacterAvatar = ({
  look,
  animation = 'idle',
  loop = animation === 'idle',
  still = false,
  scale = 2,
  className,
  style,
  ...props
}: CharacterAvatarProps) => {
  const { row, frames } = AVATAR_MANIFEST.animations[animation]
  const isLabelled = Boolean(props['aria-label'] || props['aria-labelledby'])

  return (
    <div
      data-slot="character-avatar"
      role={isLabelled ? 'img' : undefined}
      aria-hidden={isLabelled ? undefined : true}
      className={cn('relative size-(--avatar-cell) shrink-0', className)}
      style={
        {
          '--avatar-cell': `${AVATAR_MANIFEST.frameSize * scale}px`,
          '--avatar-columns': AVATAR_MANIFEST.columns,
          '--avatar-row': row,
          '--avatar-frames': frames,
          '--avatar-iterations': loop ? 'infinite' : 1,
          ...style
        } as CSSProperties
      }
      {...props}
    >
      {avatarLayers(look).map(({ src }) => (
        // Keyed by the animation, so switching to another one starts it from its first frame
        <div
          key={`${animation}:${src}`}
          className={cn('avatar-layer', still && 'animate-none!')}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
    </div>
  )
}
