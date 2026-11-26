import { z } from 'zod'

import { classNotFound } from '@/models/class/errors'
import { classModel } from '@/models/class/model'
import { classEventModel } from '@/models/class-event/model'
import { studentNotInClass } from '@/models/enrollment/errors'
import { ledgerModel } from '@/models/ledger/model'
import { objectiveNotFound } from '@/models/mission/errors'
import { mapIdOf } from '@/models/mission/maps'
import { missionModel } from '@/models/mission/model'
import { enrollmentRepo } from '@/repositories/enrollment-repo'
import { objectiveSubmissionRepo } from '@/repositories/objective-submission-repo'

import {
  missionNotPublished,
  objectiveAlreadySubmitted,
  objectiveLocked,
  studentAlreadySubmitted,
  submissionNotFound
} from './errors'
import {
  currentObjectiveIndex,
  isAvailable,
  isLate,
  latePenaltyOf,
  objectiveStatesOf
} from './rules'
import {
  type CompleteObjectiveInput,
  completeObjectiveSchema,
  type ReturnSubmissionInput,
  returnSubmissionSchema,
  type SubmissionInput,
  submissionSchema
} from './schema'

// The ids come from the URL or the client, and Postgres rejects a value that isn't a UUID
const isId = (id: string) => z.uuid().safeParse(id).success

// After the transaction, so a screen that fetches again on the event sees the change
const announce = (classId: string) =>
  classEventModel.publish(classId, 'mission')

const submit = async (
  studentId: string,
  classId: string,
  objectiveId: string,
  input: SubmissionInput
) => {
  if (!isId(classId)) throw classNotFound()
  if (!isId(objectiveId)) throw objectiveNotFound()
  const fields = submissionSchema.parse(input)
  const result = await objectiveSubmissionRepo.submit(
    studentId,
    classId,
    objectiveId,
    fields,
    ({ objectiveIds, submittedObjectiveIds, hasOpenSubmission }) => {
      if (!isAvailable(objectiveIds, submittedObjectiveIds, objectiveId)) {
        throw objectiveLocked()
      }
      if (hasOpenSubmission) throw objectiveAlreadySubmitted()
    }
  )
  if (result === 'not_enrolled') throw classNotFound()
  if (result === 'objective_not_found') throw objectiveNotFound()
  await announce(classId)
  return result
}

const requireOwnedClass = async (teacherId: string, classId: string) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) throw classNotFound()
  return schoolClass
}

// The reward comes from the objective as it is now, as a behavior's does, and the penalty from the
// date the student sent it, not the date of the approval
const approve = async (
  teacherId: string,
  classId: string,
  submissionId: string
) => {
  const schoolClass = await requireOwnedClass(teacherId, classId)
  const pending = isId(submissionId)
    ? await objectiveSubmissionRepo.findPending(schoolClass.id, submissionId)
    : undefined
  if (!pending) throw submissionNotFound()

  await ledgerModel.payQuest(
    pending.enrollmentId,
    {
      objectiveId: pending.objectiveId,
      xp: pending.xpReward,
      coins: pending.coinReward,
      createdById: teacherId
    },
    latePenaltyOf(pending, pending.submittedAt),
    async (transaction, entryId) => {
      const settled = await objectiveSubmissionRepo.settle(
        schoolClass.id,
        submissionId,
        { status: 'approved', ledgerEntryId: entryId, decidedById: teacherId },
        transaction
      )
      if (!settled) throw submissionNotFound()
    }
  )
  await announce(schoolClass.id)
}

const returnSubmission = async (
  teacherId: string,
  classId: string,
  submissionId: string,
  input: ReturnSubmissionInput
) => {
  const { comment } = returnSubmissionSchema.parse(input)
  const schoolClass = await requireOwnedClass(teacherId, classId)
  const settled = isId(submissionId)
    ? await objectiveSubmissionRepo.settle(schoolClass.id, submissionId, {
        status: 'returned',
        teacherComment: comment,
        decidedById: teacherId
      })
    : undefined
  if (!settled) throw submissionNotFound()
  await announce(schoolClass.id)
}

const listPending = async (teacherId: string, classId: string) => {
  const schoolClass = await classModel.findOwned(teacherId, classId)
  if (!schoolClass) return
  const submissions = await objectiveSubmissionRepo.listPendingOfClass(
    schoolClass.id
  )
  return {
    schoolClass,
    submissions: submissions.map(
      ({ studentEmail, studentUsername, studentPending, ...submission }) => ({
        ...submission,
        late: isLate(submission.submittedAt, submission.dueOn),
        // Same rule as the roster: only a pending student's email is the teacher's to see
        studentDetail: studentPending ? studentEmail : studentUsername
      })
    )
  }
}

const countPending = async (teacherId: string, classId: string) =>
  isId(classId)
    ? objectiveSubmissionRepo.countPendingOfOwnedClass(teacherId, classId)
    : 0

const findPublishedObjective = async (
  teacherId: string,
  classId: string,
  missionId: string,
  objectiveId: string
) => {
  const [mission, objective] = await Promise.all([
    missionModel.findOwned(teacherId, classId, missionId),
    missionModel.findObjective(teacherId, classId, missionId, objectiveId)
  ])
  if (!mission || !objective) return
  return { mission, objective }
}

const listCompletable = async (
  teacherId: string,
  classId: string,
  missionId: string,
  objectiveId: string
) => {
  const found = await findPublishedObjective(
    teacherId,
    classId,
    missionId,
    objectiveId
  )
  if (!found?.mission.published) return
  const students = await objectiveSubmissionRepo.listCompletable(
    classId,
    found.objective.id
  )
  return {
    ...found,
    students: students.map(({ email, username, pending, ...student }) => ({
      ...student,
      // Same rule as the roster: only a pending student's email is the teacher's to see
      detail: pending ? email : username
    }))
  }
}

// An activity done in class, with nothing to send. No late penalty: the teacher marks it when they
// can, which may be after the due date
const complete = async (
  teacherId: string,
  classId: string,
  missionId: string,
  objectiveId: string,
  input: CompleteObjectiveInput
) => {
  const { studentIds } = completeObjectiveSchema.parse(input)
  const found = await findPublishedObjective(
    teacherId,
    classId,
    missionId,
    objectiveId
  )
  if (!found) throw objectiveNotFound()
  if (!found.mission.published) throw missionNotPublished()
  const { objective } = found

  const uniqueStudentIds = [...new Set(studentIds)]
  const enrollmentIds = await enrollmentRepo.listActiveIds(
    classId,
    uniqueStudentIds
  )
  if (enrollmentIds.length !== uniqueStudentIds.length) {
    throw studentNotInClass()
  }

  await ledgerModel.payQuestBatch(
    enrollmentIds,
    {
      objectiveId: objective.id,
      xp: objective.xpReward,
      coins: objective.coinReward,
      createdById: teacherId
    },
    async (transaction, enrollmentId, entryId) => {
      const inserted = await objectiveSubmissionRepo.insertCompleted(
        transaction,
        {
          enrollmentId,
          objectiveId: objective.id,
          ledgerEntryId: entryId,
          decidedById: teacherId
        }
      )
      if (!inserted) throw studentAlreadySubmitted()
    }
  )
  await announce(classId)
  return { objectiveName: objective.name, studentCount: enrollmentIds.length }
}

type StudentMissionRows = NonNullable<
  Awaited<ReturnType<typeof objectiveSubmissionRepo.listMissionsOfStudent>>
>

// A locked objective gives only its name: the story is the next part of the adventure
const missionsOf = ({ rows, latestSubmissions }: StudentMissionRows) => {
  const latest = new Map(
    latestSubmissions.map((submission) => [submission.objectiveId, submission])
  )
  const rowsByMission = Map.groupBy(rows, ({ mission }) => mission.id)
  return rowsByMission
    .values()
    .map((missionRows) => {
      const { mission } = missionRows[0]!
      const states = objectiveStatesOf(
        missionRows.map(({ objective }) => objective.id),
        new Map(
          missionRows.flatMap(({ objective }) => {
            const submission = latest.get(objective.id)
            return submission
              ? [[objective.id, submission.status] as const]
              : []
          })
        )
      )
      const objectives = missionRows.map(({ objective }, index) => {
        const state = states[index]!
        if (state === 'locked') {
          return { id: objective.id, name: objective.name, state }
        }
        const submission = latest.get(objective.id)
        return {
          ...objective,
          state,
          submission: submission && {
            text: submission.text,
            link: submission.link,
            teacherComment: submission.teacherComment
          }
        }
      })
      return {
        ...mission,
        map: mapIdOf(mission.map),
        objectiveCount: objectives.length,
        approvedCount: states.filter((state) => state === 'approved').length,
        currentObjective: objectives[currentObjectiveIndex(states)],
        objectives
      }
    })
    .toArray()
}

const listMissionsForStudent = async (studentId: string, classId: string) => {
  if (!isId(classId)) return
  const found = await objectiveSubmissionRepo.listMissionsOfStudent(
    studentId,
    classId
  )
  return found && missionsOf(found)
}

// `undefined` for a draft, a removed mission and one of another class alike
const findMissionForStudent = async (
  studentId: string,
  classId: string,
  missionId: string
) => {
  if (!isId(classId) || !isId(missionId)) return
  const found = await objectiveSubmissionRepo.listMissionsOfStudent(
    studentId,
    classId,
    missionId
  )
  return found && missionsOf(found)[0]
}

export const objectiveSubmissionModel = {
  submit,
  approve,
  returnSubmission,
  listPending,
  countPending,
  listCompletable,
  complete,
  listMissionsForStudent,
  findMissionForStudent
}
