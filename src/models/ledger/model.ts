import { z } from 'zod'

import { HP_MAX, type LedgerEntryType } from '@/constants/game'
import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { studentNotInClass } from '@/models/enrollment/errors'
import { enrollmentRepo } from '@/repositories/enrollment-repo'
import {
  type Balances,
  ledgerRepo,
  type RecordedEntry
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

// A purchase, a power or an HP restore has a flow of its own (#17, #20, #21), and a level bonus only
// leaves together with its entry
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
  const batchId = await ledgerRepo.recordBatch(plans)
  if (!batchId) throw studentNotInClass()
  return batchId
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

  // The page comes from the URL, where anything but a page number means the first one
  const page = historyPageSchema.safeParse(rawPage).data ?? 1
  // One more than a page, to know whether there is a next one
  const found = await ledgerRepo.listHistory(schoolClass.id, {
    studentId,
    limit: HISTORY_PAGE_SIZE + 1,
    offset: (page - 1) * HISTORY_PAGE_SIZE
  })
  return {
    schoolClass,
    student,
    page,
    hasNextPage: found.length > HISTORY_PAGE_SIZE,
    entries: found
      .slice(0, HISTORY_PAGE_SIZE)
      .map(
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

export const ledgerModel = {
  record,
  recordBatch,
  restoreFallen,
  reverseBatch,
  reverseEntry,
  listHistory
}
