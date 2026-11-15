import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import { requireRole } from '@/entry/session'
import { AVATAR_MANIFEST } from '@/models/avatar/manifest'
import { appearanceOf } from '@/models/character/look'
import { characterModel } from '@/models/character/model'
import type { CharacterInput } from '@/models/character/schema'

import { chooseCharacter, updateAppearance } from './_components/action'
import { CharacterForm } from './_components/character-form'

export const metadata: Metadata = { title: 'Turma' }

const FIRST_CHARACTER: CharacterInput = {
  characterClass: 'warrior',
  bodyType: AVATAR_MANIFEST.bodyTypes[0],
  skin: AVATAR_MANIFEST.skins[0],
  hairStyle: 'plain',
  hairColor: AVATAR_MANIFEST.hairColors[0],
  outfitColor: AVATAR_MANIFEST.outfitColors.warrior[0]
}

const StudentClassPage = async ({
  params
}: PageProps<'/aluno/turmas/[id]'>) => {
  const { id: classId } = await params
  const { user } = await requireRole('student')
  const enrollment = await characterModel.findOfStudent(user.id, classId)
  if (!enrollment) notFound()
  const { className, look } = enrollment

  return (
    <>
      <Link
        href="/aluno"
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar ao painel
      </Link>
      <h1 className="text-sm leading-relaxed wrap-anywhere">{className}</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-sm leading-relaxed">
              {look ? 'Seu personagem' : 'Escolha seu personagem'}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CharacterForm
            chosenCharacterClass={look?.characterClass}
            defaultValues={
              look
                ? { characterClass: look.characterClass, ...appearanceOf(look) }
                : FIRST_CHARACTER
            }
            action={(look ? updateAppearance : chooseCharacter).bind(
              null,
              classId
            )}
          />
        </CardContent>
      </Card>
    </>
  )
}

export default StudentClassPage
