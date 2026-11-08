import { eq, sql } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { ZodError } from 'zod'

import { HP_MAX } from '@/constants/game'
import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import {
  accounts,
  enrollments,
  ledgerEntries,
  users
} from '@/infra/database/schema'
import { NotFoundError, ValidationError } from '@/infra/errors'
import { classModel } from '@/models/class/model'
import { HISTORY_PAGE_SIZE, LEVEL_BONUS_COINS } from '@/models/ledger/constants'
import { ledgerModel } from '@/models/ledger/model'
import { orchestrator } from '@/tests/orchestrator'

const newUserId = async (role: UserRole) => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role })
    .returning()
  return user!.id
}

const newEnrollment = async () => {
  const teacherId = await newUserId('teacher')
  const studentId = await newUserId('student')
  const schoolClass = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  const [enrollment] = await database
    .insert(enrollments)
    .values({ studentId, classId: schoolClass.id })
    .returning()
  return {
    teacherId,
    studentId,
    classId: schoolClass.id,
    enrollmentId: enrollment!.id
  }
}

const balancesOf = async (enrollmentId: string) => {
  const [balances] = await database
    .select({
      xp: enrollments.xp,
      hp: enrollments.hp,
      coins: enrollments.coins
    })
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
  return balances
}

const ledgerTotalsOf = async (enrollmentId: string) => {
  const [totals] = await database
    .select({
      xp: sql<number>`coalesce(sum(${ledgerEntries.xpDelta}), 0)::int`,
      hp: sql<number>`${HP_MAX} + coalesce(sum(${ledgerEntries.hpDelta}), 0)::int`,
      coins: sql<number>`coalesce(sum(${ledgerEntries.coinDelta}), 0)::int`
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.enrollmentId, enrollmentId))
  return totals
}

const entriesOf = async (enrollmentId: string) =>
  database
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.enrollmentId, enrollmentId))

const behaviorEntry = (enrollmentId: string, deltas = {}) => ({
  enrollmentId,
  type: 'behavior' as const,
  xpDelta: 0,
  hpDelta: 0,
  coinDelta: 0,
  ...deltas
})

describe('ledgerModel.record', () => {
  test('starts the enrollment with full HP and no XP or coins', async () => {
    const { enrollmentId } = await newEnrollment()

    expect(await balancesOf(enrollmentId)).toEqual({
      xp: 0,
      hp: HP_MAX,
      coins: 0
    })
  })

  test('records the entry and updates the balances', async () => {
    const { teacherId, enrollmentId } = await newEnrollment()
    const sourceId = crypto.randomUUID()

    const { entry, balances, level } = await ledgerModel.record({
      ...behaviorEntry(enrollmentId, {
        xpDelta: 30,
        hpDelta: -5,
        coinDelta: 2
      }),
      sourceId,
      createdById: teacherId
    })

    expect(entry).toMatchObject({
      type: 'behavior',
      xpDelta: 30,
      hpDelta: -5,
      coinDelta: 2,
      sourceId,
      createdById: teacherId,
      parentEntryId: null
    })
    expect(balances).toEqual({ xp: 30, hp: HP_MAX - 5, coins: 2 })
    expect(level).toBe(1)
    expect(await balancesOf(enrollmentId)).toEqual(balances)
  })

  test('adds a coin bonus linked to the entry for each level crossed', async () => {
    const { enrollmentId } = await newEnrollment()

    const { entry, derivedEntries, level } = await ledgerModel.record(
      behaviorEntry(enrollmentId, { xpDelta: 300, coinDelta: 1 })
    )

    expect(level).toBe(3)
    expect(derivedEntries).toHaveLength(2)
    for (const derived of derivedEntries) {
      expect(derived).toMatchObject({
        type: 'level_bonus',
        coinDelta: LEVEL_BONUS_COINS,
        parentEntryId: entry.id
      })
    }
    const balances = await balancesOf(enrollmentId)
    expect(balances?.coins).toBe(1 + 2 * LEVEL_BONUS_COINS)
  })

  test('stores the deltas applied after clamping HP and coins', async () => {
    const { enrollmentId } = await newEnrollment()
    await ledgerModel.record(behaviorEntry(enrollmentId, { coinDelta: 3 }))

    const { entry, balances } = await ledgerModel.record(
      behaviorEntry(enrollmentId, { hpDelta: -(HP_MAX + 20), coinDelta: -10 })
    )

    expect(entry).toMatchObject({ hpDelta: -HP_MAX, coinDelta: -3 })
    expect(balances).toEqual({ xp: 0, hp: 0, coins: 0 })
  })

  test('keeps the balances equal to the sum of the entries under concurrent entries', async () => {
    const { enrollmentId } = await newEnrollment()

    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        ledgerModel.record(
          behaviorEntry(enrollmentId, {
            xpDelta: 40,
            hpDelta: index % 2 === 0 ? -15 : 10,
            coinDelta: index % 3 === 0 ? -4 : 3
          })
        )
      )
    )

    const balances = await balancesOf(enrollmentId)
    expect(balances?.xp).toBe(400)
    expect(balances).toEqual(await ledgerTotalsOf(enrollmentId))
  })

  test('refuses a purchase without enough coins and records nothing', async () => {
    const { enrollmentId } = await newEnrollment()
    await ledgerModel.record(behaviorEntry(enrollmentId, { coinDelta: 4 }))

    await expect(
      ledgerModel.record({
        ...behaviorEntry(enrollmentId, { coinDelta: -5 }),
        type: 'reward_purchase',
        requireCoins: true
      })
    ).rejects.toThrow(ValidationError)
    expect(await entriesOf(enrollmentId)).toHaveLength(1)
    const balances = await balancesOf(enrollmentId)
    expect(balances?.coins).toBe(4)
  })

  test('lowers XP only in a reversal', async () => {
    const { enrollmentId } = await newEnrollment()
    await ledgerModel.record(behaviorEntry(enrollmentId, { xpDelta: 150 }))

    await expect(
      ledgerModel.record(behaviorEntry(enrollmentId, { xpDelta: -50 }))
    ).rejects.toThrow(ZodError)

    const { balances, level, derivedEntries } = await ledgerModel.record({
      ...behaviorEntry(enrollmentId, { xpDelta: -150 }),
      type: 'reversal'
    })
    expect(balances.xp).toBe(0)
    expect(level).toBe(1)
    expect(derivedEntries).toEqual([])
  })

  test('rejects an enrollment that does not exist', async () => {
    const entry = behaviorEntry(crypto.randomUUID(), { xpDelta: 10 })

    await expect(ledgerModel.record(entry)).rejects.toThrow(NotFoundError)
  })
})

const recordedEntryOf = async (enrollmentId: string, deltas = {}) => {
  const { entry } = await ledgerModel.record(
    behaviorEntry(enrollmentId, deltas)
  )
  return entry
}

const xpOf = async (enrollmentId: string) => {
  const balances = await balancesOf(enrollmentId)
  return balances!.xp
}

describe('ledgerModel.reverseEntry', () => {
  test('reverses the entry and its level bonus, restoring the balances', async () => {
    const { teacherId, classId, enrollmentId } = await newEnrollment()
    const entry = await recordedEntryOf(enrollmentId, {
      xpDelta: 100,
      coinDelta: 5
    })

    await ledgerModel.reverseEntry(teacherId, classId, entry.id)

    expect(await balancesOf(enrollmentId)).toEqual({
      xp: 0,
      hp: HP_MAX,
      coins: 0
    })
    expect(await ledgerTotalsOf(enrollmentId)).toEqual({
      xp: 0,
      hp: HP_MAX,
      coins: 0
    })
    const entries = await entriesOf(enrollmentId)
    const reversals = entries.filter(({ type }) => type === 'reversal')
    expect(reversals).toHaveLength(2)
  })

  test('leaves the other entries of the batch alone', async () => {
    const { teacherId, classId, enrollmentId } = await newEnrollment()
    await ledgerModel.recordBatch([enrollmentId], {
      type: 'behavior',
      xpDelta: 10,
      hpDelta: 0,
      coinDelta: 0
    })
    const kept = await recordedEntryOf(enrollmentId, { coinDelta: 3 })
    const entries = await entriesOf(enrollmentId)
    const batchEntry = entries.find(({ id }) => id !== kept.id)

    await ledgerModel.reverseEntry(teacherId, classId, batchEntry!.id)

    expect(await balancesOf(enrollmentId)).toMatchObject({ xp: 0, coins: 3 })
  })

  test('rejects an entry already reversed', async () => {
    const { teacherId, classId, enrollmentId } = await newEnrollment()
    const entry = await recordedEntryOf(enrollmentId, { xpDelta: 10 })
    await ledgerModel.reverseEntry(teacherId, classId, entry.id)

    await expect(
      ledgerModel.reverseEntry(teacherId, classId, entry.id)
    ).rejects.toThrow(ValidationError)
    expect(await xpOf(enrollmentId)).toBe(0)
  })

  test('applies concurrent reversals of an entry only once', async () => {
    const { teacherId, classId, enrollmentId } = await newEnrollment()
    const entry = await recordedEntryOf(enrollmentId, { xpDelta: 10 })

    const results = await Promise.allSettled([
      ledgerModel.reverseEntry(teacherId, classId, entry.id),
      ledgerModel.reverseEntry(teacherId, classId, entry.id)
    ])

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1
    )
    expect(await xpOf(enrollmentId)).toBe(0)
  })

  test('rejects a level bonus on its own and an entry type that cannot be reversed', async () => {
    const { teacherId, classId, enrollmentId } = await newEnrollment()
    await recordedEntryOf(enrollmentId, { xpDelta: 100 })
    const { entry: restore } = await ledgerModel.record({
      ...behaviorEntry(enrollmentId),
      type: 'hp_restore'
    })
    const entries = await entriesOf(enrollmentId)
    const bonus = entries.find(({ type }) => type === 'level_bonus')

    for (const id of [bonus!.id, restore.id]) {
      await expect(
        ledgerModel.reverseEntry(teacherId, classId, id)
      ).rejects.toThrow(ValidationError)
    }
  })

  test('rejects the entry of a student who left the class', async () => {
    const { teacherId, classId, enrollmentId } = await newEnrollment()
    const entry = await recordedEntryOf(enrollmentId, { xpDelta: 10 })
    await database
      .update(enrollments)
      .set({ endedAt: new Date() })
      .where(eq(enrollments.id, enrollmentId))

    await expect(
      ledgerModel.reverseEntry(teacherId, classId, entry.id)
    ).rejects.toThrow(ValidationError)
  })

  test('hides the entry from another teacher and another class', async () => {
    const { enrollmentId } = await newEnrollment()
    const other = await newEnrollment()
    const entry = await recordedEntryOf(enrollmentId, { xpDelta: 10 })

    await expect(
      ledgerModel.reverseEntry(other.teacherId, other.classId, entry.id)
    ).rejects.toThrow(NotFoundError)
    await expect(
      ledgerModel.reverseEntry(other.teacherId, other.classId, 'malformed')
    ).rejects.toThrow(NotFoundError)
    expect(await xpOf(enrollmentId)).toBe(10)
  })
})

describe('ledgerModel.listHistory', () => {
  test('nests the level bonus and the reversal in their entry', async () => {
    const { teacherId, classId, enrollmentId } = await newEnrollment()
    const { entry } = await ledgerModel.record(
      behaviorEntry(enrollmentId, { xpDelta: 100, createdById: teacherId })
    )
    await ledgerModel.reverseEntry(teacherId, classId, entry.id)

    const history = await ledgerModel.listHistory(teacherId, classId, {})

    expect(history!.entries).toHaveLength(1)
    const [listed] = history!.entries
    expect(listed).toMatchObject({ id: entry.id, reversible: false })
    expect(listed!.authorName).toEqual(expect.any(String))
    expect(listed!.derivedEntries).toMatchObject([
      { type: 'level_bonus', coinDelta: LEVEL_BONUS_COINS }
    ])
    expect(listed!.reversals).toHaveLength(2)
  })

  test('lists the entries of a student who left the class as not reversible', async () => {
    const { teacherId, classId, studentId, enrollmentId } =
      await newEnrollment()
    const otherStudentId = await newUserId('student')
    const [otherEnrollment] = await database
      .insert(enrollments)
      .values({ studentId: otherStudentId, classId })
      .returning()
    await ledgerModel.record(behaviorEntry(enrollmentId, { xpDelta: 10 }))
    await ledgerModel.record(
      behaviorEntry(otherEnrollment!.id, { xpDelta: 20 })
    )
    await database
      .update(enrollments)
      .set({ endedAt: new Date() })
      .where(eq(enrollments.id, enrollmentId))

    const history = await ledgerModel.listHistory(teacherId, classId, {
      studentId
    })

    expect(history!.student?.id).toBe(studentId)
    expect(history!.entries).toMatchObject([
      { xpDelta: 10, studentId, reversible: false }
    ])
  })

  test('shows the email of a pending student only, once per entry', async () => {
    const { teacherId, classId, studentId, enrollmentId } =
      await newEnrollment()
    await ledgerModel.record(behaviorEntry(enrollmentId, { xpDelta: 10 }))
    const username = orchestrator.newUsername()

    const pending = await ledgerModel.listHistory(teacherId, classId, {})
    await database
      .update(users)
      .set({ username })
      .where(eq(users.id, studentId))
    await database.insert(accounts).values(
      ['credential', 'google'].map((providerId) => ({
        userId: studentId,
        accountId: studentId,
        providerId
      }))
    )
    const active = await ledgerModel.listHistory(teacherId, classId, {})

    expect(pending!.entries[0]!.studentDetail).toContain('@')
    expect(active!.entries).toHaveLength(1)
    expect(active!.entries[0]!.studentDetail).toBe(username)
  })

  test('splits the entries into pages', async () => {
    const { teacherId, classId, enrollmentId } = await newEnrollment()
    for (let index = 0; index <= HISTORY_PAGE_SIZE; index++) {
      await ledgerModel.record(behaviorEntry(enrollmentId, { coinDelta: 1 }))
    }

    const first = await ledgerModel.listHistory(teacherId, classId, {
      page: 'invalid'
    })
    const second = await ledgerModel.listHistory(teacherId, classId, {
      page: '2'
    })

    expect(first).toMatchObject({ page: 1, hasNextPage: true })
    expect(first!.entries).toHaveLength(HISTORY_PAGE_SIZE)
    expect(second).toMatchObject({ page: 2, hasNextPage: false })
    expect(second!.entries).toHaveLength(1)
  })

  test('finds nothing for another teacher or a student outside the class', async () => {
    const { teacherId, classId } = await newEnrollment()
    const other = await newEnrollment()

    expect(
      await ledgerModel.listHistory(other.teacherId, classId, {})
    ).toBeUndefined()
    for (const studentId of [other.studentId, 'malformed']) {
      expect(
        await ledgerModel.listHistory(teacherId, classId, { studentId })
      ).toBeUndefined()
    }
  })
})
