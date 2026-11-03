import { and, desc, eq, isNull } from 'drizzle-orm'

import { database } from '@/infra/database/client'
import { classes } from '@/infra/database/schema'

type ClassFields = { name: string; description: string | null }

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

  insert: async (teacherId: string, fields: ClassFields) => {
    const [schoolClass] = await database
      .insert(classes)
      .values({ teacherId, ...fields })
      .returning()
    return schoolClass!
  },

  updateActive: async (
    teacherId: string,
    classId: string,
    fields: ClassFields
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
