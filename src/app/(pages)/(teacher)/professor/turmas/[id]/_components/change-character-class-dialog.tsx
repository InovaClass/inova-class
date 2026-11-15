'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/app/components/ui/8bit/button'
import { DialogContent } from '@/app/components/ui/8bit/dialog'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/app/components/ui/shadcn/dialog'
import type { FormState } from '@/entry/form-action'
import type { CharacterClass } from '@/models/avatar/layers'
import { CHARACTER_CLASS_NAMES } from '@/models/character/constants'
import { CHARACTER_CLASSES } from '@/models/character/look'

type ChangeCharacterClassDialogProps = {
  studentLabel: string
  currentCharacterClass: CharacterClass
  onChange: (characterClass: CharacterClass) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

export const ChangeCharacterClassDialog = ({
  studentLabel,
  currentCharacterClass,
  onChange
}: ChangeCharacterClassDialogProps) => {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<FormState>(IDLE_STATE)
  const [pending, startTransition] = useTransition()

  const handleOpenChange = (nextOpen: boolean) => {
    // The change can't be cancelled, so closing now would look like a cancel while it still goes through
    if (pending) return
    setOpen(nextOpen)
    setState(IDLE_STATE)
  }

  const change = (characterClass: CharacterClass) => {
    startTransition(async () => {
      const result = await onChange(characterClass)
      if (result.status === 'success') setOpen(false)
      setState(result.status === 'success' ? IDLE_STATE : result)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        Trocar classe
        <span className="sr-only"> de {studentLabel}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm leading-relaxed">
            Trocar classe
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed wrap-anywhere">
            {`A classe atual de ${studentLabel} é ${CHARACTER_CLASS_NAMES[currentCharacterClass]}. Na nova classe, a roupa volta à primeira cor, e o resto da aparência continua igual.`}
          </DialogDescription>
        </DialogHeader>
        <FormMessage state={state} />
        {/* Not every screen reader voices aria-disabled on the focused button */}
        <p role="status" className="sr-only">
          {pending ? 'Trocando classe…' : ''}
        </p>
        {/* Tailwind's `list-style: none` makes Safari drop the list semantics */}
        <ul role="list" className="flex flex-col gap-4 p-1.5">
          {CHARACTER_CLASSES.filter(
            (characterClass) => characterClass !== currentCharacterClass
          ).map((characterClass) => (
            <li key={characterClass}>
              <Button
                variant="outline"
                disabled={pending}
                focusableWhenDisabled
                onClick={() => change(characterClass)}
                className="w-full aria-disabled:pointer-events-none aria-disabled:opacity-50"
              >
                {CHARACTER_CLASS_NAMES[characterClass]}
              </Button>
            </li>
          ))}
        </ul>
        <div className="p-1.5">
          <DialogClose render={<Button variant="ghost" />} disabled={pending}>
            Cancelar
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
