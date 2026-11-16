import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import { rewards, users } from '@/infra/database/schema'
import { NotFoundError } from '@/infra/errors'
import { classModel } from '@/models/class/model'
import { DEFAULT_REWARDS } from '@/models/reward/constants'
import { rewardModel } from '@/models/reward/model'
import { orchestrator } from '@/tests/orchestrator'

const newUserId = async (role: UserRole) => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role })
    .returning()
  return user!.id
}

const newClassOfTeacher = async () => {
  const teacherId = await newUserId('teacher')
  const { id: classId } = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  return { teacherId, classId }
}

const namesOf = (list: { name: string }[]) =>
  list.map(({ name }) => name).toSorted((a, b) => a.localeCompare(b))

const REWARD = { name: 'Recompensa', description: '', price: '10', stock: '' }

describe('rewardModel', () => {
  test('a new class starts with the default rewards', async () => {
    const { teacherId, classId } = await newClassOfTeacher()

    const listed = await rewardModel.list(teacherId, classId)

    expect(namesOf(listed)).toEqual(namesOf(DEFAULT_REWARDS))
  })

  test('a blank stock is a reward without a limit', async () => {
    const { teacherId, classId } = await newClassOfTeacher()

    const created = await rewardModel.create(teacherId, classId, REWARD)
    const updated = await rewardModel.update(teacherId, classId, created.id, {
      ...REWARD,
      stock: '3'
    })

    expect(created.stock).toBeNull()
    expect(updated.stock).toBe(3)
  })

  test('a removed reward leaves the list and keeps its row', async () => {
    const { teacherId, classId } = await newClassOfTeacher()
    const reward = await rewardModel.create(teacherId, classId, REWARD)

    await rewardModel.remove(teacherId, classId, reward.id)

    const listed = await rewardModel.list(teacherId, classId)
    expect(listed.map(({ id }) => id)).not.toContain(reward.id)
    const [row] = await database
      .select({ removedAt: rewards.removedAt })
      .from(rewards)
      .where(eq(rewards.id, reward.id))
    expect(row!.removedAt).not.toBeNull()
  })

  test("another teacher can't change a reward", async () => {
    const { teacherId, classId } = await newClassOfTeacher()
    const reward = await rewardModel.create(teacherId, classId, REWARD)
    const otherTeacherId = await newUserId('teacher')

    expect(
      await rewardModel.findOwned(otherTeacherId, classId, reward.id)
    ).toBeUndefined()
    await expect(
      rewardModel.update(otherTeacherId, classId, reward.id, REWARD)
    ).rejects.toThrow(NotFoundError)
    await expect(
      rewardModel.remove(otherTeacherId, classId, reward.id)
    ).rejects.toThrow(NotFoundError)
  })
})
