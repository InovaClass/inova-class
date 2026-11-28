import { z } from 'zod'

import { lookOf } from '@/models/character/look'
import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { classEventModel } from '@/models/class-event/model'
import { studentNotInClass } from '@/models/enrollment/errors'
import { enrollmentRepo } from '@/repositories/enrollment-repo'
import { messageRepo } from '@/repositories/message-repo'

import {
  MESSAGE_RATE_WINDOW_IN_MS,
  MESSAGES_MAX_PAGES,
  MESSAGES_PAGE_SIZE
} from './constants'
import {
  boardClosed,
  messageNotFound,
  studentMuted,
  tooManyMessages
} from './errors'
import { boardPagesOf, canRemove, postBlockOf } from './rules'
import { type MessageInput, messageSchema } from './schema'

type MessageRow = Awaited<ReturnType<typeof messageRepo.list>>[number]

// The ids come from the URL or the client, and Postgres rejects a value that isn't a UUID
const isId = (id: string) => z.uuid().safeParse(id).success

const requireOwnedClass = async (teacherId: string, classId: string) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  return schoolClass
}

// Undefined for a class the student left or never joined, and for a closed board
const findStudentBoard = async (studentId: string, classId: string) => {
  const enrollment = isId(classId)
    ? await enrollmentRepo.findOfStudent(studentId, classId)
    : undefined
  return enrollment?.chatEnabled ? enrollment : undefined
}

// `pages` comes from the URL, so anything but a number reads as the first page
const listRows = async (
  classId: string,
  { includeRemoved, pages: input }: { includeRemoved: boolean; pages: unknown }
) => {
  const parsed = z.coerce.number().safeParse(input)
  const pages = boardPagesOf(parsed.success ? parsed.data : 1)
  const limit = pages * MESSAGES_PAGE_SIZE
  const rows = await messageRepo.list(classId, {
    includeRemoved,
    limit: limit + 1
  })
  return {
    rows: rows.slice(0, limit),
    pages,
    hasMore: rows.length > limit && pages < MESSAGES_MAX_PAGES
  }
}

const authorOf = (row: MessageRow) => ({
  name: row.authorName,
  isTeacher: row.authorRole === 'teacher',
  // The teacher has no enrollment, so the left join brings no items either
  look: lookOf({ ...row, equippedItems: row.equippedItems ?? [] })
})

const listForTeacher = async (
  teacherId: string,
  classId: string,
  pages?: unknown
) => {
  await requireOwnedClass(teacherId, classId)
  const {
    rows,
    pages: shownPages,
    hasMore
  } = await listRows(classId, {
    includeRemoved: true,
    pages
  })
  return {
    pages: shownPages,
    hasMore,
    messages: rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      author: authorOf(row),
      isOwn: row.authorId === teacherId,
      // Only a student still in the class can be muted from their message
      mutableStudent:
        row.authorRole === 'student' && row.authorEnrolled
          ? { id: row.authorId, muted: row.authorMutedAt !== null }
          : undefined,
      removed: row.removedAt
        ? { at: row.removedAt, byName: row.removedByName }
        : undefined,
      canRemove: canRemove({ id: teacherId, role: 'teacher' }, row)
    }))
  }
}

// Without the removed messages, nor who removed what
const listForStudent = async (
  studentId: string,
  classId: string,
  pages?: unknown
) => {
  const board = await findStudentBoard(studentId, classId)
  if (!board) return
  const {
    rows,
    pages: shownPages,
    hasMore
  } = await listRows(classId, {
    includeRemoved: false,
    pages
  })
  return {
    className: board.className,
    muted: board.chatMutedAt !== null,
    pages: shownPages,
    hasMore,
    messages: rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      author: authorOf(row),
      isOwn: row.authorId === studentId,
      canRemove: canRemove({ id: studentId, role: 'student' }, row)
    }))
  }
}

const postAsTeacher = async (
  teacherId: string,
  classId: string,
  input: MessageInput
) => {
  const { body } = messageSchema.parse(input)
  await requireOwnedClass(teacherId, classId)
  await messageRepo.insert(classId, teacherId, body)
  await classEventModel.publish(classId, 'message')
}

const POST_BLOCK_ERRORS = {
  closed: boardClosed,
  muted: studentMuted,
  'rate-limited': tooManyMessages
}

const postAsStudent = async (
  studentId: string,
  classId: string,
  input: MessageInput
) => {
  const { body } = messageSchema.parse(input)
  const message = isId(classId)
    ? await messageRepo.insertForStudent(studentId, classId, body, {
        since: new Date(Date.now() - MESSAGE_RATE_WINDOW_IN_MS),
        check: (poster) => {
          const block = postBlockOf(poster)
          if (block) throw POST_BLOCK_ERRORS[block]()
        }
      })
    : undefined
  if (!message) throw classNotFound()
  await classEventModel.publish(classId, 'message')
}

const removeMessage = async (
  viewer: { id: string; role: 'teacher' | 'student' },
  classId: string,
  messageId: string
) => {
  const message = isId(messageId)
    ? await messageRepo.findInClass(classId, messageId)
    : undefined
  if (!message || !canRemove(viewer, message)) throw messageNotFound()
  // A concurrent removal finds the message already gone
  const removed = await messageRepo.markRemoved(messageId, viewer.id)
  if (!removed) throw messageNotFound()
  await classEventModel.publish(classId, 'message')
}

const removeAsTeacher = async (
  teacherId: string,
  classId: string,
  messageId: string
) => {
  await requireOwnedClass(teacherId, classId)
  await removeMessage({ id: teacherId, role: 'teacher' }, classId, messageId)
}

const removeAsStudent = async (
  studentId: string,
  classId: string,
  messageId: string
) => {
  if (!(await findStudentBoard(studentId, classId))) throw classNotFound()
  await removeMessage({ id: studentId, role: 'student' }, classId, messageId)
}

const setMuted = async (
  teacherId: string,
  classId: string,
  studentId: string,
  muted: boolean
) => {
  await requireOwnedClass(teacherId, classId)
  const enrollment = isId(studentId)
    ? await messageRepo.setMuted(
        classId,
        studentId,
        z.boolean().parse(muted) ? new Date() : null
      )
    : undefined
  if (!enrollment) throw studentNotInClass()
  // The student's board swaps the composer for the notice, or back
  await classEventModel.publish(classId, 'message')
}

export const messageModel = {
  listForTeacher,
  listForStudent,
  postAsTeacher,
  postAsStudent,
  removeAsTeacher,
  removeAsStudent,
  setMuted
}
