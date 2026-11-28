import { z } from 'zod'

import { lookOf } from '@/models/character/look'
import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { classEventModel } from '@/models/class-event/model'
import { studentNotInClass } from '@/models/enrollment/errors'
import { objectiveNotFound } from '@/models/mission/errors'
import { missionModel } from '@/models/mission/model'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'
import { isUnlocked } from '@/models/objective-submission/rules'
import { enrollmentRepo } from '@/repositories/enrollment-repo'
import { messageRepo } from '@/repositories/message-repo'

import {
  MESSAGE_RATE_WINDOW_IN_MS,
  MESSAGES_MAX_PAGES,
  MESSAGES_PAGE_SIZE
} from './constants'
import {
  boardClosed,
  discussionClosed,
  messageNotFound,
  studentMuted,
  tooManyMessages
} from './errors'
import { boardPagesOf, canRemove, isThreadShown, postBlockOf } from './rules'
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
  {
    objectiveId,
    includeRemoved,
    pages: input
  }: { objectiveId: string | null; includeRemoved: boolean; pages: unknown }
) => {
  const parsed = z.coerce.number().safeParse(input)
  const pages = boardPagesOf(parsed.success ? parsed.data : 1)
  const limit = pages * MESSAGES_PAGE_SIZE
  const rows = await messageRepo.list(classId, {
    objectiveId,
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

const teacherMessageOf = (row: MessageRow, teacherId: string) => ({
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
})

// Without the removed messages, nor who removed what
const studentMessageOf = (row: MessageRow, studentId: string) => ({
  id: row.id,
  body: row.body,
  createdAt: row.createdAt,
  author: authorOf(row),
  isOwn: row.authorId === studentId,
  canRemove: canRemove({ id: studentId, role: 'student' }, row)
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
    objectiveId: null,
    includeRemoved: true,
    pages
  })
  return {
    pages: shownPages,
    hasMore,
    messages: rows.map((row) => teacherMessageOf(row, teacherId))
  }
}

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
    objectiveId: null,
    includeRemoved: false,
    pages
  })
  return {
    className: board.className,
    muted: board.chatMutedAt !== null,
    pages: shownPages,
    hasMore,
    messages: rows.map((row) => studentMessageOf(row, studentId))
  }
}

// `expanded` comes from the URL: the one discussion that lists more than its latest page
type ExpandedThread = { objectiveId?: unknown; pages?: unknown }

const listThread = async (
  classId: string,
  objective: { id: string; discussionEnabled: boolean },
  {
    includeRemoved,
    expanded
  }: { includeRemoved: boolean; expanded: ExpandedThread }
) => {
  const thread = await listRows(classId, {
    objectiveId: objective.id,
    includeRemoved,
    pages: expanded.objectiveId === objective.id ? expanded.pages : 1
  })
  if (
    !isThreadShown({
      discussionEnabled: objective.discussionEnabled,
      messageCount: thread.rows.length
    })
  ) {
    return
  }
  return {
    ...thread,
    objectiveId: objective.id,
    discussionEnabled: objective.discussionEnabled
  }
}

// Every active objective, a draft's included, since the teacher may prepare the discussion
const listThreadsForTeacher = async (
  teacherId: string,
  classId: string,
  missionId: string,
  expanded: ExpandedThread = {}
) => {
  await requireOwnedClass(teacherId, classId)
  const objectives = await missionModel.listObjectives(
    teacherId,
    classId,
    missionId
  )
  const threads = await Promise.all(
    objectives.map((objective) =>
      listThread(classId, objective, { includeRemoved: true, expanded })
    )
  )
  return threads
    .filter((thread) => thread !== undefined)
    .map(({ rows, ...thread }) => ({
      ...thread,
      messages: rows.map((row) => teacherMessageOf(row, teacherId))
    }))
}

// Only the objectives the student reached: a locked one would spoil the story. Undefined wherever
// the mission page is not found
const listThreadsForStudent = async (
  studentId: string,
  classId: string,
  missionId: string,
  expanded: ExpandedThread = {}
) => {
  if (!isId(classId)) return
  const [enrollment, mission] = await Promise.all([
    enrollmentRepo.findOfStudent(studentId, classId),
    objectiveSubmissionModel.findMissionForStudent(
      studentId,
      classId,
      missionId
    )
  ])
  if (!enrollment || !mission) return
  const threads = await Promise.all(
    mission.objectives.map((objective) =>
      objective.state === 'locked'
        ? undefined
        : listThread(classId, objective, { includeRemoved: false, expanded })
    )
  )
  return {
    muted: enrollment.chatMutedAt !== null,
    threads: threads
      .filter((thread) => thread !== undefined)
      .map(({ rows, ...thread }) => ({
        ...thread,
        messages: rows.map((row) => studentMessageOf(row, studentId))
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
  await messageRepo.insert(classId, teacherId, body, null)
  await classEventModel.publish(classId, 'message')
}

// A closed discussion takes the teacher's composer away too: it reopens in the objective's form
const postToThreadAsTeacher = async (
  teacherId: string,
  classId: string,
  objectiveId: string,
  input: MessageInput
) => {
  const { body } = messageSchema.parse(input)
  await requireOwnedClass(teacherId, classId)
  const objective = isId(objectiveId)
    ? await messageRepo.findObjectiveOfClass(classId, objectiveId)
    : undefined
  if (!objective) throw objectiveNotFound()
  if (!objective.discussionEnabled) throw discussionClosed()
  await messageRepo.insert(classId, teacherId, body, objectiveId)
  await classEventModel.publish(classId, 'message')
}

const POST_BLOCK_ERRORS = {
  closed: boardClosed,
  muted: studentMuted,
  'rate-limited': tooManyMessages
}

// The discussion of an objective works with the class board closed
const postForStudent = async (
  studentId: string,
  classId: string,
  objectiveId: string | null,
  input: MessageInput
) => {
  const { body } = messageSchema.parse(input)
  if (!isId(classId)) throw classNotFound()
  if (objectiveId !== null && !isId(objectiveId)) throw objectiveNotFound()
  const message = await messageRepo.insertForStudent(studentId, classId, body, {
    objectiveId,
    since: new Date(Date.now() - MESSAGE_RATE_WINDOW_IN_MS),
    check: ({ chatEnabled, objective, ...poster }) => {
      // Same answer for a locked objective as for a missing one, so the id reveals nothing
      if (
        objectiveId !== null &&
        (!objective || !isUnlocked(objective, objectiveId))
      ) {
        throw objectiveNotFound()
      }
      const block = postBlockOf({
        ...poster,
        open: objective ? objective.discussionEnabled : chatEnabled
      })
      if (block === 'closed' && objective) throw discussionClosed()
      if (block) throw POST_BLOCK_ERRORS[block]()
    }
  })
  if (!message) throw classNotFound()
  await classEventModel.publish(classId, 'message')
}

const postAsStudent = async (
  studentId: string,
  classId: string,
  input: MessageInput
) => postForStudent(studentId, classId, null, input)

const postToThreadAsStudent = async (
  studentId: string,
  classId: string,
  objectiveId: string,
  input: MessageInput
) => postForStudent(studentId, classId, objectiveId, input)

const findMessage = async (classId: string, messageId: string) => {
  const message =
    isId(classId) && isId(messageId)
      ? await messageRepo.findInClass(classId, messageId)
      : undefined
  if (!message) throw messageNotFound()
  return message
}

const removeMessage = async (
  viewer: { id: string; role: 'teacher' | 'student' },
  classId: string,
  messageId: string,
  message: { authorId: string; removedAt: Date | null }
) => {
  if (!canRemove(viewer, message)) throw messageNotFound()
  // A concurrent removal finds the message already gone
  const removed = await messageRepo.markRemoved(messageId, viewer.id)
  if (!removed) throw messageNotFound()
  await classEventModel.publish(classId, 'message')
}

// The teacher removes from the board and from any discussion, a closed one included
const removeAsTeacher = async (
  teacherId: string,
  classId: string,
  messageId: string
) => {
  await requireOwnedClass(teacherId, classId)
  const message = await findMessage(classId, messageId)
  await removeMessage(
    { id: teacherId, role: 'teacher' },
    classId,
    messageId,
    message
  )
}

// Only where the student still reads the message: the open board, or the discussion of an
// objective they reached, which stays readable once closed
const removeAsStudent = async (
  studentId: string,
  classId: string,
  messageId: string
) => {
  const message = await findMessage(classId, messageId)
  if (message.objectiveId === null) {
    if (!(await findStudentBoard(studentId, classId))) throw classNotFound()
  } else {
    const access = await messageRepo.findStudentObjectiveAccess(
      studentId,
      classId,
      message.objectiveId
    )
    if (!access || !isUnlocked(access, message.objectiveId)) {
      throw messageNotFound()
    }
  }
  await removeMessage(
    { id: studentId, role: 'student' },
    classId,
    messageId,
    message
  )
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
  // The student's board and discussions swap the composer for the notice, or back
  await classEventModel.publish(classId, 'message')
}

export const messageModel = {
  listForTeacher,
  listForStudent,
  listThreadsForTeacher,
  listThreadsForStudent,
  postAsTeacher,
  postAsStudent,
  postToThreadAsTeacher,
  postToThreadAsStudent,
  removeAsTeacher,
  removeAsStudent,
  setMuted
}
