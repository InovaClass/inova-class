import { cn } from 'cn'
import type { Metadata } from 'next'

import { CharacterAvatar } from '@/app/components/ui/custom/character-avatar'
import type { AvatarLook } from '@/models/avatar/layers'
import { AVATAR_MANIFEST } from '@/models/avatar/manifest'

export const metadata: Metadata = { title: 'Créditos' }

const SAMPLE_LOOKS: AvatarLook[] = [
  {
    bodyType: 'male',
    skin: 'light',
    hairStyle: 'plain',
    hairColor: 'black',
    characterClass: 'warrior',
    outfitColor: 'steel',
    items: []
  },
  {
    bodyType: 'female',
    skin: 'brown',
    hairStyle: 'ponytail',
    hairColor: 'redhead',
    characterClass: 'mage',
    outfitColor: 'purple',
    items: ['wizard-hat']
  },
  {
    bodyType: 'male',
    skin: 'black',
    hairStyle: 'afro',
    hairColor: 'dark_brown',
    characterClass: 'healer',
    outfitColor: 'white',
    items: []
  }
]

const linkClassName = 'underline underline-offset-4'

// Paths and URLs have no spaces to break at on a phone
const longTokenClassName = 'wrap-anywhere'

const CreditsPage = () => (
  <>
    <h1>Créditos</h1>

    <div className="flex flex-wrap justify-center gap-4">
      {SAMPLE_LOOKS.map((look) => (
        <CharacterAvatar key={look.characterClass} look={look} />
      ))}
    </div>

    <p>
      Os personagens do inova.class usam arte do Liberated Pixel Cup (LPC),
      reunida no{' '}
      <a href={AVATAR_MANIFEST.upstream.repository} className={linkClassName}>
        Universal LPC Spritesheet Character Generator
      </a>
      . Recortamos e recolorimos os sprites para o jogo, e cada peça mantém a
      licença original, listada abaixo com os autores.
    </p>

    {AVATAR_MANIFEST.credits.map((credit) => (
      <section key={credit.file} className="flex flex-col gap-1">
        <h2>{credit.name}</h2>
        <p className={cn(longTokenClassName, 'text-muted-foreground')}>
          {credit.file}
        </p>
        {'notes' in credit && (
          <p className={longTokenClassName}>{credit.notes}</p>
        )}
        <p>Autores: {credit.authors.join(', ')}</p>
        <p>Licenças: {credit.licenses.join(', ')}</p>
        {credit.urls.map((url) => (
          <a
            key={url}
            href={url}
            className={cn(linkClassName, longTokenClassName)}
          >
            {url}
          </a>
        ))}
      </section>
    ))}
  </>
)

export default CreditsPage
