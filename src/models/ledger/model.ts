import { z } from 'zod'

import { HP_MAX, type LedgerEntryType } from '@/constants/game'
import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { classEventModel } from '@/models/class-event/model'
import { studentNotInClass } from '@/models/enrollment/errors'
import { isItemId, ITEM_CATALOG } from '@/models/item/constants'
import { enrollmentRepo } from '@/repositories/enrollment-repo'
import {
  type Balances,
  type EntryPlan,
  ledgerRepo,
  type RecordedEntry,
  type Transaction
} from '@/repositories/ledger-repo'
import { objectiveSubmissionRepo } from '@/repositories/objective-submission-repo'

import { applyDeltas, applyReversals } from './balance'
import { HISTORY_PAGE_SIZE } from './constants'
import {
  batchAlreadyReversed,
  batchNotFound,
  entryAlreadyReversed,
  entryNotFound,
  entryNotReversible,
  notEnoughCoins,
  studentLacksCoins,
  studentNotFallen
} from './errors'
import { levelOf } from './level'
import {
  historyPageSchema,
  type LedgerEntryInput,
  ledgerEntrySchema
} from './schema'

type ParsedEntry = Omit<z.output<typeof ledgerEntrySchema>, 'enrollmentId'>

const isId = (id: string) => z.uuid().safeParse(id).success

// After the transaction, so a screen that fetches again on the event sees the change
const announce = (classId: string) => classEventModel.publish(classId, 'ledger')

// A purchase, a power or an HP restore has a flow of its own (#17, #20, #21, #32), and a level
// bonus or a late penalty only leaves together with its entry
const REVERSIBLE_TYPES: Set<LedgerEntryType> = new Set([
  'behavior',
  'quest_reward'
])

const canReverse = (type: LedgerEntryType, enrollmentEndedAt: Date | null) =>
  REVERSIBLE_TYPES.has(type) && !enrollmentEndedAt

const planEntry =
  ({ requireCoins, ...entry }: ParsedEntry) =>
  (balances: Balances) => {
    if (requireCoins && balances.coins + entry.coinDelta < 0) {
      throw notEnoughCoins()
    }
    const {
      applied,
      levelBonuses,
      balances: next
    } = applyDeltas(balances, entry)
    return {
      entry: { ...entry, ...applied },
      derivedEntries: levelBonuses.map((coinDelta) => ({
        type: 'level_bonus' as const,
        xpDelta: 0,
        hpDelta: 0,
        coinDelta,
        createdById: entry.createdById
      })),
      balances: next
    }
  }

const record = async (input: LedgerEntryInput) => {
  const { enrollmentId, ...entry } = ledgerEntrySchema.parse(input)
  const recorded = await ledgerRepo.record(enrollmentId, planEntry(entry))
  if (!recorded) throw studentNotInClass()
  await announce(recorded.classId)
  return { ...recorded, level: levelOf(recorded.balances.xp) }
}

const recordBatch = async (
  enrollmentIds: string[],
  input: Omit<LedgerEntryInput, 'enrollmentId'>
) => {
  const plans = new Map(
    enrollmentIds.map((id) => {
      const { enrollmentId, ...entry } = ledgerEntrySchema.parse({
        ...input,
        enrollmentId: id
      })
      return [enrollmentId, planEntry(entry)]
    })
  )
  const recorded = await ledgerRepo.recordBatch(plans)
  if (!recorded) throw studentNotInClass()
  await Promise.all(recorded.classIds.map((classId) => announce(classId)))
  return recorded.batchId
}

// Checked under the lock of the enrollment, so two concurrent draws can't both restore the HP
const restoreFallen = async (
  enrollmentId: string,
  sourceId: string,
  createdById: string
) => {
  const { enrollmentId: id, ...entry } = ledgerEntrySchema.parse({
    enrollmentId,
    type: 'hp_restore',
    xpDelta: 0,
    hpDelta: HP_MAX,
    coinDelta: 0,
    sourceId,
    createdById
  })
  const plan = planEntry(entry)
  const recorded = await ledgerRepo.record(id, (balances) => {
    if (balances.hp > 0) throw studentNotFallen()
    return plan(balances)
  })
  if (!recorded) throw studentNotInClass()
  await announce(recorded.classId)
}

// Checked under the lock of the enrollment, as the reservation was, so the coins are never spent twice.
// `confirm` runs in the same transaction, so the entry and the decision on the request go together
const spendOnPower = async (
  enrollmentId: string,
  {
    powerId,
    cost,
    createdById
  }: { powerId: string; cost: number; createdById: string },
  confirm: (transaction: Transaction, entryId: string) => Promise<void>
) => {
  const { enrollmentId: id, ...entry } = ledgerEntrySchema.parse({
    enrollmentId,
    type: 'power',
    xpDelta: 0,
    hpDelta: 0,
    coinDelta: -cost,
    sourceId: powerId,
    createdById
  })
  const plan = planEntry(entry)
  const recorded = await ledgerRepo.record(
    id,
    (balances) => {
      // A coin penalty doesn't respect the reservation, so the coins may no longer cover the cost
      if (balances.coins < cost) throw studentLacksCoins()
      return plan(balances)
    },
    confirm
  )
  if (!recorded) throw studentNotInClass()
  await announce(recorded.classId)
}

// `claim` runs under the lock of the enrollment, before the entry, and gives back the price: it
// checks and takes what else the purchase needs (the stock, the coins not reserved), so two
// purchases never spend the same coins or the last unit. `confirm` runs in the same transaction
const spendOnReward = async (
  enrollmentId: string,
  { rewardId, createdById }: { rewardId: string; createdById: string },
  {
    claim,
    confirm
  }: {
    claim: (transaction: Transaction, balances: Balances) => Promise<number>
    confirm: (transaction: Transaction, entryId: string) => Promise<void>
  }
) => {
  // The price is only known under the lock, so the entry takes it from `claim`
  const { enrollmentId: id, ...entry } = ledgerEntrySchema.parse({
    enrollmentId,
    type: 'reward_purchase',
    xpDelta: 0,
    hpDelta: 0,
    coinDelta: 0,
    sourceId: rewardId,
    createdById,
    requireCoins: true
  })
  const recorded = await ledgerRepo.record(
    id,
    async (balances, transaction) => {
      const price = await claim(transaction, balances)
      return planEntry({ ...entry, coinDelta: -price })(balances)
    },
    confirm
  )
  if (!recorded) throw studentNotInClass()
  await announce(recorded.classId)
}

// `sourceId` is the inventory row, since an item id isn't a UUID
const spendOnItem = async (
  enrollmentId: string,
  { ownedItemId, createdById }: { ownedItemId: string; createdById: string },
  {
    claim,
    confirm
  }: {
    claim: (transaction: Transaction, balances: Balances) => Promise<number>
    confirm: (transaction: Transaction, entryId: string) => Promise<void>
  }
) => {
  const { enrollmentId: id, ...entry } = ledgerEntrySchema.parse({
    enrollmentId,
    type: 'item_purchase',
    xpDelta: 0,
    hpDelta: 0,
    coinDelta: 0,
    sourceId: ownedItemId,
    createdById,
    requireCoins: true
  })
  const recorded = await ledgerRepo.record(
    id,
    async (balances, transaction) => {
      const price = await claim(transaction, balances)
      return planEntry({ ...entry, coinDelta: -price })(balances)
    },
    confirm
  )
  if (!recorded) throw studentNotInClass()
  await announce(recorded.classId)
}

// A new entry rather than a reversal, so the purchase stays in the history next to its refund.
// `confirm` runs in the same transaction, so the refund and the cancellation go together
const refundReward = async (
  enrollmentId: string,
  {
    rewardId,
    price,
    createdById
  }: { rewardId: string; price: number; createdById: string },
  confirm: (transaction: Transaction, entryId: string) => Promise<void>
) => {
  const { enrollmentId: id, ...entry } = ledgerEntrySchema.parse({
    enrollmentId,
    type: 'reward_refund',
    xpDelta: 0,
    hpDelta: 0,
    coinDelta: price,
    sourceId: rewardId,
    createdById
  })
  const recorded = await ledgerRepo.record(id, planEntry(entry), confirm)
  if (!recorded) throw studentNotInClass()
  await announce(recorded.classId)
}

type QuestPayment = {
  objectiveId: string
  xp: number
  coins: number
  createdById: string
}

// The penalty is an entry derived from the reward, after its level bonuses, so reversing the reward
// also gives the penalty back (#95). It goes through the same limits, so it only takes what there is
const planQuest = (
  { objectiveId, xp, coins, createdById }: QuestPayment,
  penalty?: { coins: number; hp: number }
) => {
  // The values come from the objective, which its own schema and check constraints keep valid
  const entry: ParsedEntry = {
    type: 'quest_reward',
    xpDelta: xp,
    hpDelta: 0,
    coinDelta: coins,
    sourceId: objectiveId,
    createdById,
    requireCoins: false
  }
  const plan = planEntry(entry)
  return (balances: Balances): EntryPlan => {
    const rewarded = plan(balances)
    if (!penalty) return rewarded
    const { applied, balances: next } = applyDeltas(rewarded.balances, {
      xpDelta: 0,
      hpDelta: -penalty.hp,
      coinDelta: -penalty.coins
    })
    return {
      ...rewarded,
      derivedEntries: [
        ...rewarded.derivedEntries,
        { type: 'quest_penalty', ...applied, createdById }
      ],
      balances: next
    }
  }
}

// `confirm` runs in the same transaction, so the entry and the approval of the submission go together
const payQuest = async (
  enrollmentId: string,
  payment: QuestPayment,
  penalty: { coins: number; hp: number } | undefined,
  confirm: (transaction: Transaction, entryId: string) => Promise<void>
) => {
  const recorded = await ledgerRepo.record(
    enrollmentId,
    planQuest(payment, penalty),
    confirm
  )
  if (!recorded) throw studentNotInClass()
  await announce(recorded.classId)
  return recorded.classId
}

// One batch for every student, so the teacher's completion reaches all of them or none. `confirm`
// runs under the lock of each enrollment
const payQuestBatch = async (
  enrollmentIds: string[],
  payment: QuestPayment,
  confirm: (
    transaction: Transaction,
    enrollmentId: string,
    entryId: string
  ) => Promise<void>
) => {
  const plan = planQuest(payment)
  const recorded = await ledgerRepo.recordBatch(
    new Map(enrollmentIds.map((id) => [id, plan])),
    confirm
  )
  if (!recorded) throw studentNotInClass()
  await Promise.all(recorded.classIds.map((classId) => announce(classId)))
}

const planReversals =
  (createdById: string) => (balances: Balances, entries: RecordedEntry[]) => {
    const { applied, balances: next } = applyReversals(balances, entries)
    return {
      reversals: entries.map(({ id, sourceId }, index) => ({
        ...applied[index]!,
        type: 'reversal' as const,
        sourceId,
        reversedEntryId: id,
        createdById
      })),
      balances: next
    }
  }

const reverseBatch = async (
  classId: string,
  batchId: string,
  createdById: string
) => {
  const plan = planReversals(createdById)
  const result = await ledgerRepo.reverseBatch(
    classId,
    batchId,
    (balances, entries) => {
      // Only an award is undone as a batch: a completed objective is reversed per student from the
      // history, which also returns the submission
      if (
        entries.some(
          ({ type }) => type !== 'behavior' && type !== 'level_bonus'
        )
      ) {
        throw batchNotFound()
      }
      return plan(balances, entries)
    }
  )
  if (result === 'not_found') throw batchNotFound()
  if (result === 'already_reversed') throw batchAlreadyReversed()
  await announce(classId)
}

const reverseEntry = async (
  teacherId: string,
  classId: string,
  entryId: string
) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  if (!isId(entryId)) throw entryNotFound()

  const plan = planReversals(teacherId)
  let reversedType: LedgerEntryType | undefined
  const result = await ledgerRepo.reverseEntry(
    schoolClass.id,
    entryId,
    (balances, entries, { endedAt }) => {
      const target = entries.find(({ id }) => id === entryId)
      if (!target || !canReverse(target.type, endedAt)) {
        throw entryNotReversible()
      }
      reversedType = target.type
      return plan(balances, entries)
    },
    // The objective goes back to the student, who can send it again
    async (transaction) => {
      if (reversedType !== 'quest_reward') return
      await objectiveSubmissionRepo.returnPaid(transaction, entryId, teacherId)
    }
  )
  if (result === 'not_found') throw entryNotFound()
  if (result === 'already_reversed') throw entryAlreadyReversed()
  await announce(schoolClass.id)
  if (reversedType === 'quest_reward') {
    await classEventModel.publish(schoolClass.id, 'mission')
  }
}

const listPage = async (
  classId: string,
  { studentId, page: rawPage }: { studentId?: string; page?: unknown }
) => {
  // The page comes from the URL, where anything but a page number means the first one
  const page = historyPageSchema.safeParse(rawPage).data ?? 1
  // One more than a page, to know whether there is a next one
  const found = await ledgerRepo.listHistory(classId, {
    studentId,
    limit: HISTORY_PAGE_SIZE + 1,
    offset: (page - 1) * HISTORY_PAGE_SIZE
  })
  return {
    page,
    hasNextPage: found.length > HISTORY_PAGE_SIZE,
    entries: found.slice(0, HISTORY_PAGE_SIZE).map(({ itemId, ...entry }) => ({
      ...entry,
      itemName: itemId && isItemId(itemId) ? ITEM_CATALOG[itemId].name : null
    }))
  }
}

const listHistory = async (
  teacherId: string,
  classId: string,
  { studentId, page: rawPage }: { studentId?: string; page?: unknown }
) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) return
  if (studentId !== undefined && !isId(studentId)) return
  const student = studentId
    ? await enrollmentRepo.findStudent(schoolClass.id, studentId)
    : undefined
  if (studentId && !student) return

  const { page, hasNextPage, entries } = await listPage(schoolClass.id, {
    studentId,
    page: rawPage
  })
  return {
    schoolClass,
    student,
    page,
    hasNextPage,
    entries: entries.map(
      ({
        enrollmentEndedAt,
        studentEmail,
        studentUsername,
        studentPending,
        ...entry
      }) => ({
        ...entry,
        // Same rule as the roster: only a pending student's email is the teacher's to see
        studentDetail: studentPending ? studentEmail : studentUsername,
        reversible:
          entry.reversals.length === 0 &&
          canReverse(entry.type, enrollmentEndedAt)
      })
    )
  }
}

// Who recorded an entry and whether it can be reversed are the teacher's to see, not the student's
const listStudentHistory = async (
  studentId: string,
  classId: string,
  { page: rawPage }: { page?: unknown }
) => {
  const enrollment = isId(classId)
    ? await enrollmentRepo.findOfStudent(studentId, classId)
    : undefined
  if (!enrollment) return
  const { page, hasNextPage, entries } = await listPage(classId, {
    studentId,
    page: rawPage
  })
  return {
    className: enrollment.className,
    page,
    hasNextPage,
    entries: entries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      xpDelta: entry.xpDelta,
      hpDelta: entry.hpDelta,
      coinDelta: entry.coinDelta,
      createdAt: entry.createdAt,
      behaviorName: entry.behaviorName,
      consequenceName: entry.consequenceName,
      powerName: entry.powerName,
      rewardName: entry.rewardName,
      itemName: entry.itemName,
      objectiveName: entry.objectiveName,
      derivedEntries: entry.derivedEntries,
      reversals: entry.reversals
    }))
  }
}

export const ledgerModel = {
  record,
  recordBatch,
  restoreFallen,
  spendOnPower,
  spendOnReward,
  spendOnItem,
  refundReward,
  payQuest,
  payQuestBatch,
  reverseBatch,
  reverseEntry,
  listHistory,
  listStudentHistory
}
