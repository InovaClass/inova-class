import { eq, sql } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { ZodError } from 'zod'

import { HP_MAX } from '@/constants/game'
import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import { enrollments, ledgerEntries, users } from '@/infra/database/schema'
import { NotFoundError, ValidationError } from '@/infra/errors'
import { classModel } from '@/models/class/model'
import { LEVEL_BONUS_COINS } from '@/models/ledger/constants'
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
  return { teacherId, enrollmentId: enrollment!.id }
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
