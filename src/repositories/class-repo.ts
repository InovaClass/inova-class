import { and, desc, eq, isNull } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { classes } from '@/infra/database/schema'

type ClassDetails = { name: string; description: string | null }
type ClassChanges = Partial<
  ClassDetails & { joinCode: string; joinCodeEnabled: boolean }
>

const activeClassOf = (teacherId: string, classId: string) =>
  and(
    eq(classes.id, classId),
    eq(classes.teacherId, teacherId),
    isNull(classes.archivedAt)
  )

export const classRepo = {
  listActive: async (teacherId: string) =>
    database
      .select()
      .from(classes)
      .where(and(eq(classes.teacherId, teacherId), isNull(classes.archivedAt)))
      .orderBy(desc(classes.createdAt)),

  findActive: async (teacherId: string, classId: string) => {
    const [schoolClass] = await database
      .select()
      .from(classes)
      .where(activeClassOf(teacherId, classId))
    return schoolClass
  },

  findJoinable: async (joinCode: string) => {
    const [schoolClass] = await database
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(
        and(
          eq(classes.joinCode, joinCode),
          eq(classes.joinCodeEnabled, true),
          isNull(classes.archivedAt)
        )
      )
    return schoolClass
  },

  // Archived classes count too, since the unique constraint on the column covers them
  isJoinCodeTaken: async (joinCode: string) => {
    const [schoolClass] = await database
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.joinCode, joinCode))
    return schoolClass !== undefined
  },

  insert: async (
    teacherId: string,
    fields: ClassDetails & { joinCode: string }
  ) => {
    const [schoolClass] = await database
      .insert(classes)
      .values({ teacherId, ...fields })
      .returning()
    return schoolClass!
  },

  updateActive: async (
    teacherId: string,
    classId: string,
    fields: ClassChanges
  ) => {
    const [schoolClass] = await database
      .update(classes)
      .set(fields)
      .where(activeClassOf(teacherId, classId))
      .returning()
    return schoolClass
  },

  archiveActive: async (teacherId: string, classId: string) => {
    const [schoolClass] = await database
      .update(classes)
      .set({ archivedAt: new Date() })
      .where(activeClassOf(teacherId, classId))
      .returning()
    return schoolClass
  }
}
