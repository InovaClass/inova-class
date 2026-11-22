// Adapted from 8bitcn's game-features1 block (MIT, https://www.8bitcn.com/docs/blocks/gaming/game-features1)
import { cn } from 'cn'

import { Card } from '@/app/components/ui/8bit/card'
import { CharacterAvatar } from '@/app/components/ui/custom/character-avatar'
import { CardContent } from '@/app/components/ui/shadcn/card'
import type { AvatarLook, CharacterClass } from '@/models/avatar/layers'
import { CHARACTER_CLASS_NAMES } from '@/models/character/constants'
import { CHARACTER_CLASSES } from '@/models/character/look'

type CharacterClassShowcase = {
  look: AvatarLook
  description: string
  // Spelled out, so Tailwind finds the classes. A border, since the class colors fail contrast as
  // text on the light card
  borderClassName: string
}

const SHOWCASES: Record<CharacterClass, CharacterClassShowcase> = {
  warrior: {
    look: {
      characterClass: 'warrior',
      bodyType: 'male',
      skin: 'bronze',
      hairStyle: 'messy',
      hairColor: 'dark_brown',
      outfitColor: 'steel',
      items: []
    },
    description:
      'Poderes que dão tempo, como um dia a mais de prazo ou passar a vez em uma pergunta.',
    borderClassName: 'border-class-warrior'
  },
  mage: {
    look: {
      characterClass: 'mage',
      bodyType: 'female',
      skin: 'light',
      hairStyle: 'long-straight',
      hairColor: 'blonde',
      outfitColor: 'purple',
      items: []
    },
    description:
      'Poderes de conhecimento, como pedir uma dica ou consultar o caderno durante um exercício.',
    borderClassName: 'border-class-mage'
  },
  healer: {
    look: {
      characterClass: 'healer',
      bodyType: 'female',
      skin: 'brown',
      hairStyle: 'afro',
      hairColor: 'black',
      outfitColor: 'white',
      items: []
    },
    description:
      'Poderes de apoio, como explicar um exercício a um colega ou dar mais prazo à equipe.',
    borderClassName: 'border-class-healer'
  }
}

export const LandingClasses = () => (
  <section aria-labelledby="classes" className="w-full px-4 py-16">
    <div className="mx-auto max-w-4xl">
      <div className="mb-10 text-center">
        <h2
          id="classes"
          className="mb-3 text-xl leading-relaxed font-bold tracking-tight md:text-2xl"
        >
          Classes de personagem
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Cada aluno monta o seu personagem, e a classe define os poderes que
          ele pode usar.
        </p>
      </div>

      <ul role="list" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {CHARACTER_CLASSES.map((characterClass) => (
          <li key={characterClass}>
            <Card className="h-full">
              <CardContent className="flex flex-1 flex-col items-center gap-4 text-center">
                <CharacterAvatar
                  look={SHOWCASES[characterClass].look}
                  scale={3}
                  still
                />
                <h3
                  className={cn(
                    'border-b-4 pb-2 text-sm leading-relaxed',
                    SHOWCASES[characterClass].borderClassName
                  )}
                >
                  {CHARACTER_CLASS_NAMES[characterClass]}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {SHOWCASES[characterClass].description}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  </section>
)
