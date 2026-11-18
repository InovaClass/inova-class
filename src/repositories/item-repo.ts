import { and, eq } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { classes, enrollments, ownedItems } from '@/infra/database/schema'

import { activeEnrollmentOf } from './character-repo'
import type { Transaction } from './ledger-repo'

const wearerColumns = {
  xp: enrollments.xp,
  characterClass: enrollments.characterClass,
  equippedItems: enrollments.equippedItems,
  itemShopEnabled: classes.itemShopEnabled
}

const findEnrollment = async (studentId: string, classId: string) => {
  const [enrollment] = await database
    .select({ id: enrollments.id, ...wearerColumns })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(activeEnrollmentOf(studentId, classId))
  return enrollment
}

// Read again inside the transaction, once `ledgerRepo.record` holds the lock of the enrollment, so a
// change of the character class or of the XP made in between is seen
const findLockedEnrollment = async (
  transaction: Transaction,
  enrollmentId: string
) => {
  const [enrollment] = await transaction
    .select(wearerColumns)
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(eq(enrollments.id, enrollmentId))
  return enrollment
}

const listOwned = async (studentId: string) => {
  const owned = await database
    .select({ itemId: ownedItems.itemId })
    .from(ownedItems)
    .where(eq(ownedItems.studentId, studentId))
  return owned.map(({ itemId }) => itemId)
}

const isOwned = async (
  transaction: Transaction | undefined,
  studentId: string,
  itemId: string
) => {
  const [owned] = await (transaction ?? database)
    .select({ id: ownedItems.id })
    .from(ownedItems)
    .where(
      and(eq(ownedItems.studentId, studentId), eq(ownedItems.itemId, itemId))
    )
  return owned !== undefined
}

// Two classes lock different enrollments, so a purchase of the same item in each can run at once:
// the unique constraint keeps one, and the other gets `undefined` and rolls back its entry
const insertOwned = async (
  transaction: Transaction,
  fields: {
    id: string
    studentId: string
    itemId: string
    purchaseEntryId: string
  }
) => {
  const [owned] = await transaction
    .insert(ownedItems)
    .values(fields)
    .onConflictDoNothing()
    .returning({ id: ownedItems.id })
  return owned
}

// Only while the character class is the one the items were checked against
const setEquipped = async (
  studentId: string,
  classId: string,
  characterClass: string,
  equippedItems: string[]
) => {
  const [enrollment] = await database
    .update(enrollments)
    .set({ equippedItems })
    .where(
      and(
        activeEnrollmentOf(studentId, classId),
        eq(enrollments.characterClass, characterClass)
      )
    )
    .returning({ id: enrollments.id })
  return enrollment
}

export const itemRepo = {
  findEnrollment,
  findLockedEnrollment,
  listOwned,
  isOwned,
  insertOwned,
  setEquipped
}
