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
  ledgerRepo,
  type RecordedEntry,
  type Transaction
} from '@/repositories/ledger-repo'

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
// bonus only leaves together with its entry
const canReverse = (type: LedgerEntryType, enrollmentEndedAt: Date | null) =>
  type === 'behavior' && !enrollmentEndedAt

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
  const result = await ledgerRepo.reverseBatch(
    classId,
    batchId,
    planReversals(createdById)
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
  const result = await ledgerRepo.reverseEntry(
    schoolClass.id,
    entryId,
    (balances, entries, { endedAt }) => {
      const target = entries.find(({ id }) => id === entryId)
      if (!target || !canReverse(target.type, endedAt)) {
        throw entryNotReversible()
      }
      return plan(balances, entries)
    }
  )
  if (result === 'not_found') throw entryNotFound()
  if (result === 'already_reversed') throw entryAlreadyReversed()
  await announce(schoolClass.id)
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
  reverseBatch,
  reverseEntry,
  listHistory,
  listStudentHistory
}
