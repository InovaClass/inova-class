'use client'

import { useState } from 'react'

import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { ActionButton } from '@/app/components/ui/custom/action-button'
import { CharacterAvatar } from '@/app/components/ui/custom/character-avatar'
import { CoinCounter } from '@/app/components/ui/custom/coin-counter'
import { ConfirmActionDialog } from '@/app/components/ui/custom/confirm-action-dialog'
import { FormMessage } from '@/app/components/ui/custom/form-message'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import type { FormState } from '@/entry/form-action'
import type { AvatarLook } from '@/models/avatar/layers'

type Item = {
  id: string
  name: string
  price: number
  minLevel: number
  exclusiveToName: string | null
  owned: boolean
  equipped: boolean
  fitsCharacterClass: boolean
  unlocked: boolean
  affordable: boolean
  previewLook: AvatarLook
}

type ItemShopProps = {
  shopEnabled: boolean
  availableCoins: number
  items: Item[]
  purchaseAction: (itemId: string) => Promise<FormState>
  equipAction: (itemId: string, equipped: boolean) => Promise<FormState>
}

const IDLE_STATE: FormState = { status: 'idle' }

const isWearable = (item: Item) => item.fitsCharacterClass && item.unlocked

// Equipped first: a reversal may take the level below the item, which stays on until taken off
const itemStatusOf = (item: Item) => {
  if (item.equipped) return 'Equipado'
  if (!item.fitsCharacterClass) return `Só para ${item.exclusiveToName}`
  if (!item.unlocked) return `Disponível a partir do nível ${item.minLevel}`
  if (item.owned) return 'Comprado'
  if (!item.affordable) return 'Moedas insuficientes'
}

const ItemAction = ({
  item,
  purchaseAction,
  equipAction,
  onPurchase,
  onEquip
}: Pick<ItemShopProps, 'purchaseAction' | 'equipAction'> & {
  item: Item
  onPurchase: (result: FormState) => void
  onEquip: (result: FormState) => void
}) => {
  const wearable = isWearable(item)
  if (item.owned && (wearable || item.equipped)) {
    return (
      // One button for both, so the focus stays on it when the label changes
      <ActionButton
        variant="outline"
        action={() => equipAction(item.id, !item.equipped)}
        onResult={onEquip}
      >
        {item.equipped ? 'Desequipar' : 'Equipar'}
        <span className="sr-only"> {item.name}</span>
      </ActionButton>
    )
  }
  if (!wearable || item.owned || !item.affordable) return null
  return (
    // Confirmed, since nobody can refund an item
    <ConfirmActionDialog
      triggerLabel={
        <>
          Comprar
          <span className="sr-only"> {item.name}</span>
        </>
      }
      title="Comprar item?"
      description={`Você vai gastar ${item.price} ${item.price === 1 ? 'moeda' : 'moedas'} em ${item.name}. O item fica com você em todas as turmas, e as moedas não voltam.`}
      confirmLabel="Comprar"
      confirmVariant="default"
      action={async () => {
        const result = await purchaseAction(item.id)
        // The item stays listed, so the message of an earlier purchase would mislead
        if (result.status === 'error') onPurchase(IDLE_STATE)
        return result
      }}
      onSuccess={onPurchase}
    />
  )
}

export const ItemShop = ({
  shopEnabled,
  availableCoins,
  items,
  purchaseAction,
  equipAction
}: ItemShopProps) => {
  // Out here so one message serves every row. A purchase replaces its button, so its message takes
  // the focus; equipping keeps it on the button, so its success is only announced
  const [feedback, setFeedback] = useState<FormState>(IDLE_STATE)
  const [equipResult, setEquipResult] = useState<FormState>(IDLE_STATE)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-sm leading-relaxed">Itens</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {shopEnabled ? (
          <div className="flex flex-col gap-2 text-xs leading-relaxed">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>Moedas disponíveis</span>
              <CoinCounter value={availableCoins} />
            </p>
            <p className="text-muted-foreground">
              Um item comprado é seu em todas as turmas.
            </p>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            O professor fechou a loja de itens nesta turma.
            {items.length > 0 && ' Você ainda pode usar os itens que já tem.'}
          </p>
        )}
        <FormMessage state={feedback} />
        <p aria-live="polite" className="sr-only">
          {equipResult.status === 'success' && (
            <span key={equipResult.id}>{equipResult.message}</span>
          )}
        </p>
        {items.length > 0 && (
          // Tailwind's `list-style: none` makes Safari drop the list semantics
          <ul role="list" className="flex flex-col gap-6">
            {items.map((item) => {
              const status = itemStatusOf(item)
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex min-w-0 flex-1 basis-56 items-center gap-4">
                    <CharacterAvatar look={item.previewLook} scale={1} still />
                    <div className="flex min-w-0 flex-col gap-2">
                      <p className="text-xs leading-relaxed wrap-anywhere">
                        {item.name}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-relaxed text-muted-foreground">
                        {!item.owned && <CoinCounter value={item.price} />}
                        {status && <span>{status}</span>}
                      </p>
                    </div>
                  </div>
                  {/* The frame is drawn outside the button, so it needs room for it */}
                  <div className="p-1.5 empty:hidden">
                    <ItemAction
                      item={item}
                      purchaseAction={purchaseAction}
                      equipAction={equipAction}
                      onPurchase={setFeedback}
                      onEquip={(result) => {
                        // Taking off an item the student can no longer wear removes its button,
                        // so the message takes the focus instead
                        if (
                          result.status === 'error' ||
                          (item.equipped && !isWearable(item))
                        ) {
                          setFeedback(result)
                          return
                        }
                        setEquipResult(result)
                        // A success keeps an earlier success: after a click it may hold the focus,
                        // which the SubmitButton doesn't take. An error is replaced, not removed
                        setFeedback((current) =>
                          current.status === 'error' ? result : current
                        )
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
