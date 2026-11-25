import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { MissionSummaryList } from '@/app/(pages)/(student)/_components/mission-summary-list'
import { StudentStats } from '@/app/(pages)/(student)/_components/student-stats'
import { ClassEventsRefresh } from '@/app/components/blocks/class/class-events-refresh'
import { Leaderboard } from '@/app/components/blocks/class/leaderboard'
import { linkButtonVariants } from '@/app/components/ui/8bit/button'
import { Card, CardHeader } from '@/app/components/ui/8bit/card'
import { CardContent, CardTitle } from '@/app/components/ui/shadcn/card'
import { requireRole } from '@/entry/session'
import { AVATAR_MANIFEST } from '@/models/avatar/manifest'
import { CHARACTER_CLASS_NAMES } from '@/models/character/constants'
import { appearanceOf } from '@/models/character/look'
import type { CharacterInput } from '@/models/character/schema'
import { enrollmentModel } from '@/models/enrollment/model'
import { itemModel } from '@/models/item/model'
import { equipItem } from '@/models/item/rules'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'
import { powerRequestModel } from '@/models/power-request/model'
import { rewardOrderModel } from '@/models/reward-order/model'

import {
  cancelPowerRequest,
  chooseCharacter,
  purchaseItem,
  purchaseReward,
  requestPower,
  setItemEquipped,
  updateAppearance
} from './_components/action'
import { CharacterForm } from './_components/character-form'
import { ItemShop } from './_components/item-shop'
import { PowerList } from './_components/power-list'
import { RewardShop } from './_components/reward-shop'

export const metadata: Metadata = { title: 'Turma' }

// Formatted here with a fixed zone: the server runs in UTC and students are in Brazil
const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeZone: 'America/Sao_Paulo'
})

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
  const enrollment = await enrollmentModel.findOfStudent(user.id, classId)
  if (!enrollment) notFound()
  const { className, rankingVisible, look, progress, hp, coins } = enrollment
  const [missions, powers, items, shop, ranking] = await Promise.all([
    objectiveSubmissionModel.listMissionsForStudent(user.id, classId),
    look ? powerRequestModel.listForStudent(user.id, classId) : undefined,
    look ? itemModel.listForStudent(user.id, classId) : undefined,
    rewardOrderModel.listForStudent(user.id, classId),
    rankingVisible
      ? enrollmentModel.listRankingForStudent(user.id, classId)
      : undefined
  ])

  return (
    <>
      <ClassEventsRefresh
        classId={classId}
        events={['ledger', 'power-request', 'reward-order', 'mission']}
      />
      <Link
        href="/aluno"
        className="w-fit text-xs underline underline-offset-4"
      >
        Voltar ao painel
      </Link>
      <h1 className="text-sm leading-relaxed wrap-anywhere">{className}</h1>
      <StudentStats look={look} progress={progress} hp={hp} coins={coins} />
      {/* The frame is drawn outside the link, so it needs room for it */}
      <div className="p-1.5">
        <Link
          href={`/aluno/turmas/${classId}/historico`}
          className={linkButtonVariants({ variant: 'outline' })}
        >
          Ver histórico
        </Link>
      </div>
      {missions && (
        <MissionSummaryList
          classId={classId}
          title="Missões"
          // A finished mission stays on the missions page, so this only shows what's left to do
          missions={missions.filter((mission) => mission.currentObjective)}
          empty={{
            title: 'Nenhuma missão em andamento',
            description:
              missions.length > 0
                ? 'Você concluiu todas as missões publicadas.'
                : 'As missões que o professor publicar aparecem aqui.'
          }}
        >
          {/* The frame is drawn outside the link, so it needs room for it */}
          <div className="p-1.5">
            <Link
              href={`/aluno/turmas/${classId}/missoes`}
              className={linkButtonVariants({ variant: 'outline' })}
            >
              Ver todas as missões
            </Link>
          </div>
        </MissionSummaryList>
      )}
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
            equippedItems={look?.items}
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
      {look && items && (
        <ItemShop
          shopEnabled={items.shopEnabled}
          availableCoins={items.availableCoins}
          items={items.items.map(({ exclusiveTo, ...item }) => ({
            ...item,
            exclusiveToName: exclusiveTo && CHARACTER_CLASS_NAMES[exclusiveTo],
            previewLook: {
              ...look,
              items: item.equipped
                ? items.equippedItems
                : equipItem(items.equippedItems, item.id)
            }
          }))}
          purchaseAction={purchaseItem.bind(null, classId)}
          equipAction={setItemEquipped.bind(null, classId)}
        />
      )}
      {powers && (
        <PowerList
          {...powers}
          requestAction={requestPower.bind(null, classId)}
          cancelAction={cancelPowerRequest.bind(null, classId)}
        />
      )}
      {shop && (
        <RewardShop
          availableCoins={shop.availableCoins}
          reservedCoins={shop.reservedCoins}
          rewards={shop.rewards}
          orders={shop.orders.map((order) => ({
            id: order.id,
            rewardName: order.rewardName,
            price: order.price,
            status: order.status,
            date: dateFormat.format(order.createdAt)
          }))}
          purchaseAction={purchaseReward.bind(null, classId)}
        />
      )}
      {ranking && (
        <Leaderboard
          title="Ranking"
          players={ranking.map((student, index) => ({
            // A classmate's id isn't the student's to see, so the index in the list keys the row
            key: String(index),
            position: student.position,
            name: student.name,
            level: student.level,
            xp: student.xp,
            look: student.look,
            isCurrentPlayer: student.isCurrentStudent
          }))}
        />
      )}
    </>
  )
}

export default StudentClassPage
