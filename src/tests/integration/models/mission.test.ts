import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { ZodError } from 'zod'

import { database } from '@/infra/database/client'
import { missions, objectives, users } from '@/infra/database/schema'
import { NotFoundError, ValidationError } from '@/infra/errors'
import { classModel } from '@/models/class/model'
import { missionModel } from '@/models/mission/model'
import type { ObjectiveInput } from '@/models/mission/schema'
import { orchestrator } from '@/tests/orchestrator'

const newObjective = (
  fields: Partial<ObjectiveInput> = {}
): ObjectiveInput => ({
  name: 'Objetivo da missão',
  story: 'A vila precisa de ajuda.',
  dueOn: '',
  xpReward: '10',
  coinReward: '',
  latePenaltyCoins: '',
  latePenaltyHp: '',
  ...fields
})

const newTeacherId = async () => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role: 'teacher' })
    .returning()
  return user!.id
}

const newScenario = async () => {
  const teacherId = await newTeacherId()
  const { id: classId } = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  const { id: missionId } = await missionModel.create(teacherId, classId, {
    name: 'A floresta',
    description: ''
  })
  return { teacherId, classId, missionId }
}

const addObjectives = async (
  { teacherId, classId, missionId }: Awaited<ReturnType<typeof newScenario>>,
  names: string[]
) => {
  const ids: string[] = []
  for (const name of names) {
    const { id } = await missionModel.createObjective(
      teacherId,
      classId,
      missionId,
      newObjective({ name })
    )
    ids.push(id)
  }
  return ids
}

const objectiveNames = async ({
  teacherId,
  classId,
  missionId
}: Awaited<ReturnType<typeof newScenario>>) => {
  const listed = await missionModel.listObjectives(
    teacherId,
    classId,
    missionId
  )
  return listed.map(({ name }) => name)
}

describe('missionModel', () => {
  test('lists the drafts before the published missions, each with its count of objectives', async () => {
    const scenario = await newScenario()
    const { teacherId, classId, missionId } = scenario
    await addObjectives(scenario, ['Primeiro', 'Segundo'])
    await missionModel.publish(teacherId, classId, missionId)
    const { id: draftId } = await missionModel.create(teacherId, classId, {
      name: 'O castelo',
      description: 'Rascunho'
    })

    const listed = await missionModel.list(teacherId, classId)

    expect(listed).toMatchObject([
      { id: draftId, published: false, objectiveCount: 0 },
      { id: missionId, published: true, objectiveCount: 2 }
    ])
  })

  test('appends each objective after the last one and moves it one place at a time', async () => {
    const scenario = await newScenario()
    const { teacherId, classId, missionId } = scenario
    const ids = await addObjectives(scenario, ['A', 'B', 'C'])
    const third = ids[2]

    expect(
      await missionModel.moveObjective(
        teacherId,
        classId,
        missionId,
        third!,
        'up'
      )
    ).toEqual({ position: 2, count: 3 })
    expect(await objectiveNames(scenario)).toEqual(['A', 'C', 'B'])

    await missionModel.moveObjective(
      teacherId,
      classId,
      missionId,
      third!,
      'up'
    )
    await missionModel.moveObjective(
      teacherId,
      classId,
      missionId,
      third!,
      'up'
    )
    expect(await objectiveNames(scenario)).toEqual(['C', 'A', 'B'])
  })

  test('a removed objective leaves the order without leaving a gap for the next ones', async () => {
    const scenario = await newScenario()
    const { teacherId, classId, missionId } = scenario
    const [first, second] = await addObjectives(scenario, ['A', 'B', 'C'])

    await missionModel.removeObjective(teacherId, classId, missionId, second!)
    await addObjectives(scenario, ['D'])
    await missionModel.moveObjective(
      teacherId,
      classId,
      missionId,
      first!,
      'down'
    )

    expect(await objectiveNames(scenario)).toEqual(['C', 'A', 'D'])
    const rows = await database
      .select()
      .from(objectives)
      .where(eq(objectives.id, second!))
    expect(rows).toHaveLength(1)
    await expect(
      missionModel.moveObjective(teacherId, classId, missionId, second!, 'up')
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  test('two concurrent objectives never take the same position', async () => {
    const scenario = await newScenario()
    const { teacherId, classId, missionId } = scenario

    await Promise.all(
      ['A', 'B', 'C', 'D'].map((name) =>
        missionModel.createObjective(
          teacherId,
          classId,
          missionId,
          newObjective({ name })
        )
      )
    )

    const rows = await database
      .select({ position: objectives.position })
      .from(objectives)
      .where(eq(objectives.missionId, missionId))
    expect(new Set(rows.map(({ position }) => position)).size).toBe(4)
  })

  test('publishes a mission only once and only with an objective', async () => {
    const scenario = await newScenario()
    const { teacherId, classId, missionId } = scenario

    await expect(
      missionModel.publish(teacherId, classId, missionId)
    ).rejects.toBeInstanceOf(ValidationError)

    await addObjectives(scenario, ['A'])
    await missionModel.publish(teacherId, classId, missionId)
    expect(
      await missionModel.findOwned(teacherId, classId, missionId)
    ).toMatchObject({ published: true })
    await expect(
      missionModel.publish(teacherId, classId, missionId)
    ).rejects.toBeInstanceOf(ValidationError)
  })

  test('a published mission keeps its last objective', async () => {
    const scenario = await newScenario()
    const { teacherId, classId, missionId } = scenario
    const [only] = await addObjectives(scenario, ['A'])
    await missionModel.publish(teacherId, classId, missionId)

    await expect(
      missionModel.removeObjective(teacherId, classId, missionId, only!)
    ).rejects.toBeInstanceOf(ValidationError)

    const [other] = await addObjectives(scenario, ['B'])
    await missionModel.removeObjective(teacherId, classId, missionId, other!)
    expect(await objectiveNames(scenario)).toEqual(['A'])
  })

  test('rejects a late penalty without a due date and stores the due date as a day', async () => {
    const { teacherId, classId, missionId } = await newScenario()

    await expect(
      missionModel.createObjective(
        teacherId,
        classId,
        missionId,
        newObjective({ latePenaltyHp: '5' })
      )
    ).rejects.toBeInstanceOf(ZodError)

    const { id } = await missionModel.createObjective(
      teacherId,
      classId,
      missionId,
      newObjective({ dueOn: '2026-12-01', latePenaltyHp: '5' })
    )
    expect(
      await missionModel.findObjective(teacherId, classId, missionId, id)
    ).toMatchObject({ dueOn: '2026-12-01', latePenaltyHp: 5 })
  })

  test('a removed mission leaves the list and keeps its row', async () => {
    const { teacherId, classId, missionId } = await newScenario()

    await missionModel.remove(teacherId, classId, missionId)

    expect(await missionModel.findOwned(teacherId, classId, missionId)).toBe(
      undefined
    )
    await expect(
      missionModel.createObjective(
        teacherId,
        classId,
        missionId,
        newObjective()
      )
    ).rejects.toBeInstanceOf(NotFoundError)
    const rows = await database
      .select()
      .from(missions)
      .where(eq(missions.id, missionId))
    expect(rows).toHaveLength(1)
  })

  test("another teacher and an archived class can't change a mission", async () => {
    const scenario = await newScenario()
    const { teacherId, classId, missionId } = scenario
    const [objectiveId] = await addObjectives(scenario, ['A'])
    const otherTeacherId = await newTeacherId()

    for (const id of [otherTeacherId, teacherId]) {
      if (id === teacherId) await classModel.archive(teacherId, classId)
      expect(await missionModel.findOwned(id, classId, missionId)).toBe(
        undefined
      )
      expect(await missionModel.listObjectives(id, classId, missionId)).toEqual(
        []
      )
      await expect(
        missionModel.update(id, classId, missionId, {
          name: 'Outra',
          description: ''
        })
      ).rejects.toBeInstanceOf(NotFoundError)
      await expect(
        missionModel.publish(id, classId, missionId)
      ).rejects.toBeInstanceOf(NotFoundError)
      await expect(
        missionModel.updateObjective(
          id,
          classId,
          missionId,
          objectiveId!,
          newObjective()
        )
      ).rejects.toBeInstanceOf(NotFoundError)
      await expect(
        missionModel.removeObjective(id, classId, missionId, objectiveId!)
      ).rejects.toBeInstanceOf(NotFoundError)
    }
  })

  test('a malformed id finds nothing', async () => {
    const { teacherId, classId } = await newScenario()

    expect(await missionModel.findOwned(teacherId, classId, 'abc')).toBe(
      undefined
    )
    await expect(
      missionModel.moveObjective(teacherId, classId, 'abc', 'abc', 'up')
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
