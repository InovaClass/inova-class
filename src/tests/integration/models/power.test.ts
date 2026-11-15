import { eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import { enrollments, powers, users } from '@/infra/database/schema'
import { NotFoundError } from '@/infra/errors'
import { characterModel } from '@/models/character/model'
import type { CharacterInput } from '@/models/character/schema'
import { classModel } from '@/models/class/model'
import { xpForLevel } from '@/models/ledger/level'
import { DEFAULT_POWERS } from '@/models/power/constants'
import { powerModel } from '@/models/power/model'
import type { PowerInput } from '@/models/power/schema'
import { orchestrator } from '@/tests/orchestrator'

const MAGE: CharacterInput = {
  characterClass: 'mage',
  bodyType: 'female',
  skin: 'olive',
  hairStyle: 'bob',
  hairColor: 'redhead',
  outfitColor: 'navy'
}

const newPower = (fields: Partial<PowerInput> = {}): PowerInput => ({
  characterClass: 'mage',
  name: 'Poder da turma',
  description: '',
  cost: '10',
  minLevel: '1',
  ...fields
})

const newUserId = async (role: UserRole) => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role })
    .returning()
  return user!.id
}

const newScenario = async ({ xp = 0 } = {}) => {
  const teacherId = await newUserId('teacher')
  const { id: classId } = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  const studentId = await newUserId('student')
  await database.insert(enrollments).values({ studentId, classId, xp })
  return { teacherId, classId, studentId }
}

const namesOf = (list: { name: string }[]) =>
  list.map(({ name }) => name).toSorted((a, b) => a.localeCompare(b))

describe('powerModel', () => {
  test('a new class starts with the default powers of every character class', async () => {
    const { teacherId, classId } = await newScenario()

    const listed = await powerModel.list(teacherId, classId)

    for (const [characterClass, defaults] of Object.entries(DEFAULT_POWERS)) {
      expect(
        namesOf(
          listed.filter((power) => power.characterClass === characterClass)
        )
      ).toEqual(namesOf(defaults))
    }
  })

  test('a disabled power stays listed for the teacher and comes back when enabled', async () => {
    const { teacherId, classId } = await newScenario()
    const { id } = await powerModel.create(teacherId, classId, newPower())

    await powerModel.setEnabled(teacherId, classId, id, false)
    expect(await powerModel.findOwned(teacherId, classId, id)).toMatchObject({
      disabled: true
    })

    await powerModel.setEnabled(teacherId, classId, id, true)
    expect(await powerModel.findOwned(teacherId, classId, id)).toMatchObject({
      disabled: false
    })
  })

  test('a removed power leaves the list and keeps its row', async () => {
    const { teacherId, classId } = await newScenario()
    const { id } = await powerModel.create(teacherId, classId, newPower())

    await powerModel.remove(teacherId, classId, id)

    expect(await powerModel.findOwned(teacherId, classId, id)).toBe(undefined)
    await expect(
      powerModel.setEnabled(teacherId, classId, id, true)
    ).rejects.toBeInstanceOf(NotFoundError)
    const rows = await database.select().from(powers).where(eq(powers.id, id))
    expect(rows).toHaveLength(1)
  })

  test("another teacher can't change a power", async () => {
    const { teacherId, classId } = await newScenario()
    const { id } = await powerModel.create(teacherId, classId, newPower())
    const otherTeacherId = await newUserId('teacher')

    expect(await powerModel.findOwned(otherTeacherId, classId, id)).toBe(
      undefined
    )
    await expect(
      powerModel.update(otherTeacherId, classId, id, newPower())
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(
      powerModel.setEnabled(otherTeacherId, classId, id, false)
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(
      powerModel.remove(otherTeacherId, classId, id)
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  describe('listForStudent', () => {
    test('lists only the enabled powers of the character class, each unlocked once the level reaches its minimum', async () => {
      const { teacherId, classId, studentId } = await newScenario({
        xp: xpForLevel(2)
      })
      await characterModel.choose(studentId, classId, MAGE)
      const disabled = await powerModel.create(
        teacherId,
        classId,
        newPower({ name: 'Poder desativado' })
      )
      await powerModel.setEnabled(teacherId, classId, disabled.id, false)
      const removed = await powerModel.create(
        teacherId,
        classId,
        newPower({ name: 'Poder removido' })
      )
      await powerModel.remove(teacherId, classId, removed.id)

      const listed = await powerModel.listForStudent(studentId, classId)

      expect(namesOf(listed)).toEqual(namesOf(DEFAULT_POWERS.mage))
      for (const power of listed) {
        expect(power.unlocked).toBe(power.minLevel <= 2)
      }
    })

    test('lists nothing before the character is chosen or after the student leaves', async () => {
      const { classId, studentId } = await newScenario()

      expect(await powerModel.listForStudent(studentId, classId)).toEqual([])

      await characterModel.choose(studentId, classId, MAGE)
      await database
        .update(enrollments)
        .set({ endedAt: new Date() })
        .where(eq(enrollments.studentId, studentId))

      expect(await powerModel.listForStudent(studentId, classId)).toEqual([])
    })
  })
})
