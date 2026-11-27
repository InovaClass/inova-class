'use client'

import { cn } from 'cn'
import { useWatch } from 'react-hook-form'

import {
  BODY_TYPE_LABELS,
  HAIR_COLOR_LABELS,
  HAIR_STYLE_LABELS,
  OUTFIT_COLOR_LABELS,
  SKIN_LABELS
} from '@/app/(pages)/(student)/aluno/turmas/[id]/appearance-labels'
import { CharacterAvatar } from '@/app/components/ui/custom/character-avatar'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { FormRadioGroup } from '@/app/components/ui/custom/form-radio-group'
import { SubmitButton } from '@/app/components/ui/custom/submit-button'
import { useFormAction } from '@/app/hooks/use-form-action'
import type { FormState } from '@/entry/form-action'
import type { AvatarItem, CharacterClass } from '@/models/avatar/layers'
import { AVATAR_MANIFEST } from '@/models/avatar/manifest'
import { CHARACTER_CLASS_NAMES, NO_HAIR } from '@/models/character/constants'
import {
  type AppearanceValues,
  CHARACTER_CLASSES,
  lookFrom,
  outfitColorsOf
} from '@/models/character/look'
import { type CharacterInput, characterSchema } from '@/models/character/schema'

type CharacterFormProps = {
  // Set once the student chose: from then on only the teacher changes it
  chosenCharacterClass?: CharacterClass
  // So the preview wears what the character wears
  equippedItems?: readonly AvatarItem[]
  defaultValues: CharacterInput
  action: (input: CharacterInput) => Promise<FormState<CharacterInput>>
}

// Spelled out, so Tailwind finds the classes
const CHARACTER_CLASS_BORDERS = {
  warrior: 'border-class-warrior',
  mage: 'border-class-mage',
  healer: 'border-class-healer'
} satisfies Record<CharacterClass, string>

const optionsOf = <T extends string>(
  values: readonly T[],
  labels: Record<NoInfer<T>, string>
) => values.map((value) => ({ value, label: labels[value] }))

export const CharacterForm = ({
  chosenCharacterClass,
  equippedItems,
  defaultValues,
  action
}: CharacterFormProps) => {
  const { control, setValue, state, pending, announcement, formProps } =
    useFormAction({ schema: characterSchema, defaultValues, action })
  const values = useWatch({ control }) as CharacterInput
  const characterClass =
    chosenCharacterClass ?? (values.characterClass as CharacterClass)
  const appearance: AppearanceValues = values

  return (
    <form
      {...formProps}
      className="flex flex-col gap-8 md:flex-row md:items-start"
    >
      <div className="flex flex-col items-center gap-4 md:sticky md:top-8">
        <CharacterAvatar
          look={lookFrom(characterClass, appearance, equippedItems)}
          scale={4}
          aria-label="Prévia do personagem"
        />
        <p
          className={cn(
            'border-b-4 pb-2 text-xs',
            CHARACTER_CLASS_BORDERS[characterClass]
          )}
        >
          {CHARACTER_CLASS_NAMES[characterClass]}
        </p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        {chosenCharacterClass ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Só o professor pode trocar a classe. A aparência você muda quando
            quiser.
          </p>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Depois de confirmar, só o professor pode trocar a classe. A
              aparência você muda quando quiser.
            </p>
            <FormRadioGroup
              control={control}
              name="characterClass"
              label="Classe"
              options={CHARACTER_CLASSES.map((option) => ({
                value: option,
                label: CHARACTER_CLASS_NAMES[option],
                preview: (
                  <CharacterAvatar
                    look={lookFrom(option, {
                      ...appearance,
                      outfitColor: outfitColorsOf(option)[0]!
                    })}
                    scale={1}
                    still
                  />
                )
              }))}
              // Each character class has its own outfit colors
              onValueChange={(value) =>
                setValue(
                  'outfitColor',
                  outfitColorsOf(value as CharacterClass)[0]!
                )
              }
            />
          </>
        )}
        <FormRadioGroup
          control={control}
          name="bodyType"
          label="Corpo"
          options={optionsOf(AVATAR_MANIFEST.bodyTypes, BODY_TYPE_LABELS)}
        />
        <FormRadioGroup
          control={control}
          name="skin"
          label="Tom de pele"
          options={optionsOf(AVATAR_MANIFEST.skins, SKIN_LABELS)}
        />
        <FormRadioGroup
          control={control}
          name="hairStyle"
          label="Cabelo"
          options={optionsOf(
            [...AVATAR_MANIFEST.hairStyles, NO_HAIR],
            HAIR_STYLE_LABELS
          )}
        />
        {appearance.hairStyle !== NO_HAIR && (
          <FormRadioGroup
            control={control}
            name="hairColor"
            label="Cor do cabelo"
            options={optionsOf(AVATAR_MANIFEST.hairColors, HAIR_COLOR_LABELS)}
          />
        )}
        <FormRadioGroup
          control={control}
          name="outfitColor"
          label="Cor da roupa"
          options={optionsOf(
            outfitColorsOf(
              characterClass
            ) as (keyof typeof OUTFIT_COLOR_LABELS)[],
            OUTFIT_COLOR_LABELS
          )}
        />
        <FormMessage state={state} announcement={announcement} />
        <SubmitButton
          pendingLabel={chosenCharacterClass ? 'Salvando' : 'Confirmando'}
          pending={pending}
          className="self-start"
        >
          {chosenCharacterClass ? 'Salvar aparência' : 'Confirmar personagem'}
        </SubmitButton>
      </div>
    </form>
  )
}
