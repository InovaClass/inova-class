import { isAPIError } from 'better-auth/api'
import { z } from 'zod'

import { auth } from '@/infra/auth'
import { UnauthorizedError } from '@/infra/errors'
import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { classEventModel } from '@/models/class-event/model'
import { accountRepo } from '@/repositories/account-repo'
import { messageRepo } from '@/repositories/message-repo'

import { staleSession, studentNotDeletable, wrongPassword } from './errors'
import { deleteAccountSchema } from './schema'

type RequestContext = { headers: Headers }

const isId = (id: string) => z.uuid().safeParse(id).success

// The roster, the requests, the orders, the ranking and the board of each class lose the student
const announce = async (classIds: string[]) => {
  for (const classId of classIds) {
    await classEventModel.publish(classId, 'ledger')
    await classEventModel.publish(classId, 'power-request')
    await classEventModel.publish(classId, 'reward-order')
    await classEventModel.publish(classId, 'message')
  }
}

const deletionSummary = async (user: { id: string; role: string }) => {
  const [hasPassword, totals, messageCount] = await Promise.all([
    accountRepo.hasPassword(user.id),
    user.role === 'teacher'
      ? accountRepo.countClassesAndStudents(user.id)
      : accountRepo.countStudentClasses(user.id),
    messageRepo.countByAuthor(user.id)
  ])
  return { hasPassword, ...totals, messageCount }
}

const verifyPassword = async (
  password: string,
  { headers }: RequestContext
) => {
  try {
    await auth.api.verifyPassword({ body: { password }, headers })
  } catch (error) {
    if (isAPIError(error) && error.body?.code === 'INVALID_PASSWORD') {
      throw wrongPassword()
    }
    throw error
  }
}

// Without a password, a recent sign-in stands in for it, as in Better Auth's own `deleteUser`
const requireFreshSession = async ({ headers }: RequestContext) => {
  const [session, context] = await Promise.all([
    auth.api.getSession({ headers }),
    auth.$context
  ])
  if (!session) throw new UnauthorizedError()
  const ageInMs = Date.now() - new Date(session.session.createdAt).getTime()
  if (ageInMs >= context.sessionConfig.freshAge * 1000) throw staleSession()
}

// Not Better Auth's `deleteUser`: its hooks run outside the deletion, so the stock, the invites and
// the pending students would be cleaned up in separate writes (#26)
const deleteOwn = async (
  user: { id: string; role: string },
  input: unknown,
  context: RequestContext
) => {
  if (await accountRepo.hasPassword(user.id)) {
    const { password } = deleteAccountSchema.parse(input)
    await verifyPassword(password, context)
  } else {
    await requireFreshSession(context)
  }
  const { classIds } =
    user.role === 'teacher'
      ? await accountRepo.deleteTeacher(user.id)
      : await accountRepo.deleteStudent(user.id)
  await auth.api.signOut({ headers: context.headers })
  await announce(classIds)
}

const deleteInvitedStudent = async (
  teacherId: string,
  classId: string,
  studentId: string
) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  // The id comes from the client, and Postgres rejects a value that isn't a UUID
  const deleted = isId(studentId)
    ? await accountRepo.deleteInvitedStudent(teacherId, classId, studentId)
    : undefined
  if (!deleted) throw studentNotDeletable()
  await announce(deleted.classIds)
}

export const accountModel = {
  deletionSummary,
  deleteOwn,
  deleteInvitedStudent
}
