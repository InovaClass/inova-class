import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { database } from '@/infra/database/client'
import { classes, enrollments } from '@/infra/database/schema'

import { runOnLocalDatabase } from './local-database'
import { awardRandomBehaviors, parseCount } from './seeder'

const [classId, rounds] = process.argv.slice(2)

await runOnLocalDatabase(async () => {
  if (!classId || !z.uuid().safeParse(classId).success) {
    throw new Error('Usage: pnpm db:seed:awards <class-id> [rounds]')
  }
  const [schoolClass] = await database
    .select({ teacherId: classes.teacherId, name: classes.name })
    .from(classes)
    .where(and(eq(classes.id, classId), isNull(classes.archivedAt)))
  if (!schoolClass) throw new Error(`No active class with the id ${classId}`)

  const enrolled = await database
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(and(eq(enrollments.classId, classId), isNull(enrollments.endedAt)))
  const awarded = await awardRandomBehaviors(
    schoolClass.teacherId,
    classId,
    enrolled.map(({ studentId }) => studentId),
    parseCount(rounds, 10)
  )
  console.log(`Awards in ${schoolClass.name}: ${awarded}`)
})
