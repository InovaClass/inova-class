// Adapted from 8bitcn's not-found1 block (MIT, https://www.8bitcn.com/docs/blocks/layout/not-found1)
import { cn } from 'cn'
import type { ReactNode, Ref } from 'react'

import { CharacterAvatar } from '@/app/components/ui/custom/character-avatar'
import type { AvatarLook } from '@/models/avatar/layers'

const WARRIOR_LOOK: AvatarLook = {
  characterClass: 'warrior',
  bodyType: 'male',
  skin: 'bronze',
  hairStyle: 'messy',
  hairColor: 'dark_brown',
  outfitColor: 'steel',
  items: []
}

type StatusScreenProps = {
  banner: string
  title: string
  description: string
  children: ReactNode
  headingRef?: Ref<HTMLHeadingElement>
  className?: string
}

export const StatusScreen = ({
  banner,
  title,
  description,
  children,
  headingRef,
  className
}: StatusScreenProps) => (
  <main
    className={cn(
      'grid w-full flex-1 place-content-center gap-5 bg-background px-4 py-16 text-center md:py-24',
      className
    )}
  >
    <p aria-hidden className="text-6xl font-bold tracking-tight sm:text-8xl">
      {banner}
    </p>

    <div className="-mt-6 flex justify-center">
      <CharacterAvatar look={WARRIOR_LOOK} animation="hurt" scale={3} />
    </div>

    <h1
      ref={headingRef}
      tabIndex={headingRef ? -1 : undefined}
      className="text-2xl leading-relaxed font-bold tracking-tight outline-none sm:text-4xl"
    >
      {title}
    </h1>

    <p className="text-xs leading-relaxed text-muted-foreground">
      {description}
    </p>

    <div className="flex flex-wrap justify-center gap-6">{children}</div>
  </main>
)
