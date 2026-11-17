import { z } from 'zod'

import type { UserRole } from '@/constants/user'
import {
  isRealtimeEnabled,
  publish as publishMessage,
  subscribe
} from '@/infra/realtime'
import { classRepo } from '@/repositories/class-repo'
import { enrollmentRepo } from '@/repositories/enrollment-repo'

import type { ClassEventType } from './constants'

const isId = (id: string) => z.uuid().safeParse(id).success

const channelOf = (classId: string) => `class:${classId}`

// An event only tells the screens to fetch again, through the reads that check who may see what, so
// it carries no data of the class or its students (#23)
const publish = async (classId: string, type: ClassEventType) => {
  if (!isRealtimeEnabled()) return
  try {
    await publishMessage(channelOf(classId), JSON.stringify({ type }))
  } catch (error) {
    // The change is already committed and the screens still work without the event
    console.error(error)
  }
}

const canListen = async (
  user: { id: string; role: UserRole },
  classId: string
) => {
  if (!isId(classId)) return false
  const found =
    user.role === 'teacher'
      ? await classRepo.findActive(user.id, classId)
      : await enrollmentRepo.findOfStudent(user.id, classId)
  return found !== undefined
}

// Undefined for a class the user can't see, as `classModel.findOwned` answers. Access is checked
// when the stream opens, so a student removed afterwards keeps the signals until it reconnects
const listen = async (
  user: { id: string; role: UserRole },
  classId: string,
  listener: (message: string) => void
) => {
  if (!(await canListen(user, classId))) return
  return subscribe(channelOf(classId), listener)
}

export const classEventModel = { publish, listen }
