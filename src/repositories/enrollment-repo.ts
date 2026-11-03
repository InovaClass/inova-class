import { database } from '@/infra/database/client'
import { enrollments } from '@/infra/database/schema'

export const enrollmentRepo = {
  insert: async (studentId: string, classId: string) => {
    const [enrollment] = await database
      .insert(enrollments)
      .values({ studentId, classId })
      .onConflictDoNothing()
      .returning()
    return enrollment
  }
}
