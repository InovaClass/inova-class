import { and, eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'

import type { UserRole } from '@/constants/user'
import { database } from '@/infra/database/client'
import {
  enrollments,
  ledgerEntries,
  ownedItems,
  users
} from '@/infra/database/schema'
import { ValidationError } from '@/infra/errors'
import { characterModel } from '@/models/character/model'
import type { CharacterInput } from '@/models/character/schema'
import { classModel } from '@/models/class/model'
import { itemModel } from '@/models/item/model'
import { ledgerModel } from '@/models/ledger/model'
import { orchestrator } from '@/tests/orchestrator'

const MAGE: CharacterInput = {
  characterClass: 'mage',
  bodyType: 'female',
  skin: 'olive',
  hairStyle: 'bob',
  hairColor: 'redhead',
  outfitColor: 'navy'
}

const WARRIOR: CharacterInput = {
  ...MAGE,
  characterClass: 'warrior',
  outfitColor: 'iron'
}

const newUserId = async (role: UserRole) => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role })
    .returning()
  return user!.id
}

// Level 2 starts at 100 XP and level 3 at 300
const enroll = async (
  studentId: string,
  {
    coins = 100,
    xp = 100,
    character = MAGE
  }: { coins?: number; xp?: number; character?: CharacterInput | null } = {}
) => {
  const teacherId = await newUserId('teacher')
  const { id: classId } = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  await database.insert(enrollments).values({ studentId, classId, coins, xp })
  if (character) await characterModel.choose(studentId, classId, character)
  return { teacherId, classId }
}

const newScenario = async (options?: Parameters<typeof enroll>[1]) => {
  const studentId = await newUserId('student')
  return { studentId, ...(await enroll(studentId, options)) }
}

const enrollmentOf = async (studentId: string, classId: string) => {
  const [enrollment] = await database
    .select({
      coins: enrollments.coins,
      equippedItems: enrollments.equippedItems
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId)
      )
    )
  return enrollment!
}

const coinsOf = async (studentId: string, classId: string) => {
  const { coins } = await enrollmentOf(studentId, classId)
  return coins
}

const equippedOf = async (studentId: string, classId: string) => {
  const { equippedItems } = await enrollmentOf(studentId, classId)
  return equippedItems
}

const ownedOf = async (studentId: string) =>
  database.select().from(ownedItems).where(eq(ownedItems.studentId, studentId))

describe('itemModel', () => {
  describe('purchase', () => {
    test('debits the coins and adds the item to the inventory', async () => {
      const { studentId, classId } = await newScenario({ coins: 50 })

      await itemModel.purchase(studentId, classId, 'bandana')

      expect(await enrollmentOf(studentId, classId)).toEqual({
        coins: 30,
        equippedItems: []
      })
      const [owned] = await ownedOf(studentId)
      expect(owned).toMatchObject({ itemId: 'bandana' })
      const [entry] = await database
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.id, owned!.purchaseEntryId!))
      expect(entry).toMatchObject({
        type: 'item_purchase',
        coinDelta: -20,
        sourceId: owned!.id
      })
    })

    test('names the item in the history', async () => {
      const { studentId, classId } = await newScenario()

      await itemModel.purchase(studentId, classId, 'round-glasses')

      const history = await ledgerModel.listStudentHistory(
        studentId,
        classId,
        {}
      )
      expect(history?.entries[0]).toMatchObject({
        type: 'item_purchase',
        itemName: 'Óculos redondos'
      })
    })

    test('keeps the item for every class of the student, without a second purchase', async () => {
      const { studentId, classId } = await newScenario()
      const other = await enroll(studentId)

      await itemModel.purchase(studentId, classId, 'bandana')

      const shop = await itemModel.listForStudent(studentId, other.classId)
      expect(shop?.items.find(({ id }) => id === 'bandana')).toMatchObject({
        owned: true
      })
      await expect(
        itemModel.purchase(studentId, other.classId, 'bandana')
      ).rejects.toThrow('Você já tem esse item.')
      expect(await coinsOf(studentId, other.classId)).toBe(100)
    })

    test('buys an item once when two classes buy it at the same time', async () => {
      const { studentId, classId } = await newScenario()
      const other = await enroll(studentId)

      const results = await Promise.allSettled([
        itemModel.purchase(studentId, classId, 'bandana'),
        itemModel.purchase(studentId, other.classId, 'bandana')
      ])

      expect(
        results.filter(({ status }) => status === 'fulfilled')
      ).toHaveLength(1)
      expect(await ownedOf(studentId)).toHaveLength(1)
      const coins = await Promise.all([
        coinsOf(studentId, classId),
        coinsOf(studentId, other.classId)
      ])
      expect(coins.toSorted((a, b) => a - b)).toEqual([80, 100])
    })

    test('rejects a purchase above the coins and changes nothing', async () => {
      const { studentId, classId } = await newScenario({ coins: 19 })

      await expect(
        itemModel.purchase(studentId, classId, 'bandana')
      ).rejects.toThrow('Você não tem moedas disponíveis suficientes.')
      expect(await coinsOf(studentId, classId)).toBe(19)
      expect(await ownedOf(studentId)).toEqual([])
    })

    test('rejects a purchase while the teacher disabled the shop, and still lists the owned items', async () => {
      const { teacherId, studentId, classId } = await newScenario()
      await itemModel.purchase(studentId, classId, 'bandana')

      await classModel.setItemShopEnabled(teacherId, classId, false)

      await expect(
        itemModel.purchase(studentId, classId, 'round-glasses')
      ).rejects.toThrow('O professor fechou a loja de itens nesta turma.')
      const shop = await itemModel.listForStudent(studentId, classId)
      expect(shop?.shopEnabled).toBe(false)
      expect(shop?.items.map(({ id }) => id)).toEqual(['bandana'])
    })

    test('rejects a student without a character and an unknown item', async () => {
      const { studentId, classId } = await newScenario({ character: null })

      await expect(
        itemModel.purchase(studentId, classId, 'bandana')
      ).rejects.toThrow('Você ainda não escolheu o seu personagem nesta turma.')
      await expect(
        itemModel.purchase(studentId, classId, 'cape')
      ).rejects.toThrow('Esse item não existe.')
    })
  })

  describe('equip', () => {
    test('equips an owned item in place of the one in its slot', async () => {
      const { studentId, classId } = await newScenario({ coins: 200, xp: 300 })
      await itemModel.purchase(studentId, classId, 'bandana')
      await itemModel.purchase(studentId, classId, 'crown')
      await itemModel.purchase(studentId, classId, 'round-glasses')

      await itemModel.equip(studentId, classId, 'bandana')
      await itemModel.equip(studentId, classId, 'round-glasses')
      await itemModel.equip(studentId, classId, 'crown')

      expect(await equippedOf(studentId, classId)).toEqual([
        'round-glasses',
        'crown'
      ])
    })

    test('rejects an item the student does not own', async () => {
      const { studentId, classId } = await newScenario()

      await expect(
        itemModel.equip(studentId, classId, 'bandana')
      ).rejects.toThrow('Você ainda não tem esse item.')
    })

    test('rejects in another class an item of another character class or above the level', async () => {
      const { studentId, classId } = await newScenario()
      const warriorClass = await enroll(studentId, { character: WARRIOR })
      const beginnerClass = await enroll(studentId, { xp: 0 })
      await itemModel.purchase(studentId, classId, 'wizard-hat')

      await expect(
        itemModel.equip(studentId, warriorClass.classId, 'wizard-hat')
      ).rejects.toThrow('Esse item é de outra classe de personagem.')
      await expect(
        itemModel.equip(studentId, beginnerClass.classId, 'wizard-hat')
      ).rejects.toBeInstanceOf(ValidationError)
      await itemModel.equip(studentId, classId, 'wizard-hat')
      expect(await equippedOf(studentId, classId)).toEqual(['wizard-hat'])
    })
  })

  describe('unequip', () => {
    test('removes only the given item', async () => {
      const { studentId, classId } = await newScenario()
      await itemModel.purchase(studentId, classId, 'bandana')
      await itemModel.purchase(studentId, classId, 'round-glasses')
      await itemModel.equip(studentId, classId, 'bandana')
      await itemModel.equip(studentId, classId, 'round-glasses')

      await itemModel.unequip(studentId, classId, 'bandana')

      expect(await equippedOf(studentId, classId)).toEqual(['round-glasses'])
    })
  })

  describe('a change of the character class', () => {
    test('removes the items exclusive to another class and keeps the others', async () => {
      const { teacherId, studentId, classId } = await newScenario()
      await itemModel.purchase(studentId, classId, 'wizard-hat')
      await itemModel.purchase(studentId, classId, 'round-glasses')
      await itemModel.equip(studentId, classId, 'round-glasses')
      await itemModel.equip(studentId, classId, 'wizard-hat')

      await characterModel.changeCharacterClass(teacherId, classId, studentId, {
        characterClass: 'healer'
      })

      expect(await equippedOf(studentId, classId)).toEqual(['round-glasses'])
      expect(await ownedOf(studentId)).toHaveLength(2)
    })
  })
})
