import { STUDENT_INVITE_EXPIRATION_DAYS } from '@/constants/student'
import { appBaseURL, auth } from '@/infra/auth'
import { scheduleEmails } from '@/infra/email/mailer'
import {
  classEnrollmentTemplate,
  studentInviteTemplate
} from '@/infra/email/templates'
import { acceptInviteSchema } from '@/models/authentication/schema'
import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { studentRepo } from '@/repositories/student-repo'

import { invalidInvite } from './errors'
import { inviteStudentsSchema } from './schema'
import { generateUsername, usernameBase } from './username'

const INVITE_MAX_ATTEMPTS = 3

type RequestContext = { headers: Headers }

type InvitedStudent = { id: string; email: string; username: string }

const inviteExpiration = () =>
  new Date(Date.now() + STUDENT_INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)

const newInvite = (student: InvitedStudent) => ({
  student,
  token: crypto.randomUUID(),
  expiresAt: inviteExpiration()
})

const toSavedInvite = ({ student, token, expiresAt }: Invite) => ({
  studentId: student.id,
  token,
  expiresAt
})

type Invite = ReturnType<typeof newInvite>

const inviteEmail =
  (baseURL: string, className?: string) =>
  ({ student, token }: Invite) => ({
    to: student.email,
    ...studentInviteTemplate(`${baseURL}/convite?token=${token}`, {
      username: student.username,
      className
    })
  })

const isPending = ({
  role,
  hasAccount
}: {
  role: string
  hasAccount: boolean
}) => role === 'student' && !hasAccount

const newStudentsFrom = async (
  students: { name: string; email: string }[],
  teacherId: string
) => {
  if (students.length === 0) return []
  const taken = new Set(
    await studentRepo.findUsernamesStartingWith(
      students.map(({ name }) => usernameBase(name))
    )
  )
  return students.map((student) => {
    const username = generateUsername(student.name, taken)
    taken.add(username)
    return {
      ...student,
      id: crypto.randomUUID(),
      username,
      createdById: teacherId
    }
  })
}

const saveClassInvites = async (
  teacherId: string,
  classId: string,
  students: { name: string; email: string }[]
) => {
  const existing = await studentRepo.findByEmails(
    students.map(({ email }) => email)
  )
  const existingEmails = new Set(existing.map(({ email }) => email))
  const newStudents = await newStudentsFrom(
    students.filter(({ email }) => !existingEmails.has(email)),
    teacherId
  )
  const invites = [
    ...newStudents,
    ...existing.filter((account) => isPending(account))
  ].map((student) => newInvite(student as InvitedStudent))
  const activeStudents = existing.filter(
    ({ role, hasAccount }) => role === 'student' && hasAccount
  )

  const enrolled = await studentRepo.saveInvites({
    newStudents,
    enrollments: [
      ...invites.map(({ student }) => student),
      ...activeStudents
    ].map(({ id }) => ({ studentId: id, classId })),
    invites: invites.map((invite) => toSavedInvite(invite))
  })
  if (!enrolled) return

  const enrolledIds = new Set(enrolled.map(({ studentId }) => studentId))
  return {
    invites,
    notified: activeStudents.filter(({ id }) => enrolledIds.has(id))
  }
}

const invite = async (
  teacherId: string,
  classId: string,
  input: unknown,
  { headers }: RequestContext
) => {
  const { students } = inviteStudentsSchema.parse(input)
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  const baseURL = appBaseURL(headers)

  for (let attempt = 0; attempt < INVITE_MAX_ATTEMPTS; attempt++) {
    const saved = await saveClassInvites(teacherId, classId, students)
    if (saved) {
      scheduleEmails([
        ...saved.invites.map(inviteEmail(baseURL, schoolClass.name)),
        ...saved.notified.map(({ email }) => ({
          to: email,
          ...classEnrollmentTemplate(`${baseURL}/entrar`, schoolClass.name)
        }))
      ])
      return { count: students.length }
    }
  }
  throw new Error(
    `Invite kept conflicting with other requests after ${INVITE_MAX_ATTEMPTS} attempts`
  )
}

const resendInvite = async (email: string, { headers }: RequestContext) => {
  const [account] = await studentRepo.findByEmails([email.toLowerCase()])
  if (!account || !isPending(account)) return false
  const invite = newInvite(account as InvitedStudent)
  await studentRepo.saveInvites({
    newStudents: [],
    enrollments: [],
    invites: [toSavedInvite(invite)]
  })
  scheduleEmails([inviteEmail(appBaseURL(headers))(invite)])
  return true
}

const findInvite = async (token: string) => {
  const invite = await studentRepo.findInvite(token)
  return invite?.username ? { username: invite.username } : undefined
}

const acceptInvite = async (
  input: unknown,
  { headers, token }: RequestContext & { token: string }
) => {
  const { password } = acceptInviteSchema.parse(input)
  const invite = await studentRepo.findInvite(token)
  if (!invite) throw invalidInvite()
  const context = await auth.$context
  const activated = await studentRepo.activate(
    invite.studentId,
    token,
    await context.password.hash(password)
  )
  if (!activated) throw invalidInvite()
  await auth.api.signInEmail({
    body: { email: invite.email, password },
    headers
  })
}

export const studentModel = {
  invite,
  resendInvite,
  findInvite,
  acceptInvite
}
