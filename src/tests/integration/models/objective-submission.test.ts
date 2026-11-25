import { and, eq } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { ZodError } from 'zod'

import { HP_MAX } from '@/constants/game'
import { database } from '@/infra/database/client'
import {
  enrollments,
  ledgerEntries,
  objectiveSubmissions,
  users
} from '@/infra/database/schema'
import { NotFoundError, ValidationError } from '@/infra/errors'
import { behaviorModel } from '@/models/behavior/model'
import { classModel } from '@/models/class/model'
import { enrollmentModel } from '@/models/enrollment/model'
import { ledgerModel } from '@/models/ledger/model'
import { missionModel } from '@/models/mission/model'
import type { ObjectiveInput } from '@/models/mission/schema'
import { objectiveSubmissionModel } from '@/models/objective-submission/model'
import { orchestrator } from '@/tests/orchestrator'

const newUserId = async (role: 'teacher' | 'student') => {
  const { name, email } = orchestrator.newUser()
  const [user] = await database
    .insert(users)
    .values({ name, email, role })
    .returning()
  return user!.id
}

const newObjective = (
  fields: Partial<ObjectiveInput> = {}
): ObjectiveInput => ({
  name: 'Objetivo da missão',
  story: 'A vila precisa de ajuda.',
  dueOn: '',
  xpReward: '10',
  coinReward: '4',
  latePenaltyCoins: '',
  latePenaltyHp: '',
  ...fields
})

const SUBMISSION = { text: 'Fiz a pesquisa.', link: '' }

const newScenario = async (
  objectives: Partial<ObjectiveInput>[] = [{}],
  { coins = 0 } = {}
) => {
  const teacherId = await newUserId('teacher')
  const { id: classId } = await classModel.create(
    teacherId,
    orchestrator.newClass()
  )
  const { id: missionId } = await missionModel.create(teacherId, classId, {
    name: 'A floresta',
    description: ''
  })
  const objectiveIds: string[] = []
  for (const fields of objectives) {
    const { id } = await missionModel.createObjective(
      teacherId,
      classId,
      missionId,
      newObjective(fields)
    )
    objectiveIds.push(id)
  }
  await missionModel.publish(teacherId, classId, missionId)
  const newEnrolledStudent = async () => {
    const studentId = await newUserId('student')
    await database.insert(enrollments).values({ studentId, classId, coins })
    return studentId
  }
  const studentId = await newEnrolledStudent()
  return {
    teacherId,
    classId,
    missionId,
    objectiveIds,
    studentId,
    newEnrolledStudent
  }
}

const balancesOf = async (studentId: string, classId: string) => {
  const [enrollment] = await database
    .select({
      xp: enrollments.xp,
      hp: enrollments.hp,
      coins: enrollments.coins
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.classId, classId)
      )
    )
  return enrollment!
}

const submissionOf = async (submissionId: string) => {
  const [submission] = await database
    .select()
    .from(objectiveSubmissions)
    .where(eq(objectiveSubmissions.id, submissionId))
  return submission!
}

const entriesOf = async (ledgerEntryId: string) =>
  database
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.parentEntryId, ledgerEntryId))

describe('objectiveSubmissionModel', () => {
  describe('submit', () => {
    test('opens the next objective once the previous one has a submission', async () => {
      const { classId, objectiveIds, studentId } = await newScenario([{}, {}])
      const [first, second] = objectiveIds as [string, string]

      await expect(
        objectiveSubmissionModel.submit(studentId, classId, second, SUBMISSION)
      ).rejects.toThrow(ValidationError)
      await objectiveSubmissionModel.submit(
        studentId,
        classId,
        first,
        SUBMISSION
      )
      // The first one is still pending, which is enough
      await expect(
        objectiveSubmissionModel.submit(studentId, classId, second, SUBMISSION)
      ).resolves.toBeDefined()
    })

    test('is refused while a submission of the objective is pending', async () => {
      const { classId, objectiveIds, studentId } = await newScenario()

      const results = await Promise.allSettled([
        objectiveSubmissionModel.submit(
          studentId,
          classId,
          objectiveIds[0]!,
          SUBMISSION
        ),
        objectiveSubmissionModel.submit(
          studentId,
          classId,
          objectiveIds[0]!,
          SUBMISSION
        )
      ])

      expect(
        results.filter(({ status }) => status === 'fulfilled')
      ).toHaveLength(1)
    })

    test('accepts a new submission after a return', async () => {
      const { teacherId, classId, objectiveIds, studentId } =
        await newScenario()
      const { id } = await objectiveSubmissionModel.submit(
        studentId,
        classId,
        objectiveIds[0]!,
        SUBMISSION
      )

      await objectiveSubmissionModel.returnSubmission(teacherId, classId, id, {
        comment: 'Falta a fonte.'
      })

      expect(await submissionOf(id)).toMatchObject({
        status: 'returned',
        teacherComment: 'Falta a fonte.'
      })
      await expect(
        objectiveSubmissionModel.submit(
          studentId,
          classId,
          objectiveIds[0]!,
          SUBMISSION
        )
      ).resolves.toBeDefined()
    })

    test('is refused for an objective of a draft mission', async () => {
      const { teacherId, classId, studentId } = await newScenario()
      const { id: draftId } = await missionModel.create(teacherId, classId, {
        name: 'Rascunho',
        description: ''
      })
      const { id: objectiveId } = await missionModel.createObjective(
        teacherId,
        classId,
        draftId,
        newObjective()
      )

      await expect(
        objectiveSubmissionModel.submit(
          studentId,
          classId,
          objectiveId,
          SUBMISSION
        )
      ).rejects.toThrow(NotFoundError)
    })

    test('rejects a link that is not http or https', async () => {
      const { classId, objectiveIds, studentId } = await newScenario()

      await expect(
        objectiveSubmissionModel.submit(studentId, classId, objectiveIds[0]!, {
          text: 'Fiz.',
          link: 'javascript:alert(1)'
        })
      ).rejects.toThrow(ZodError)
    })
  })

  describe('approve', () => {
    test('pays the reward and settles the submission in the same transaction', async () => {
      const { teacherId, classId, objectiveIds, studentId } =
        await newScenario()
      const { id } = await objectiveSubmissionModel.submit(
        studentId,
        classId,
        objectiveIds[0]!,
        SUBMISSION
      )

      await objectiveSubmissionModel.approve(teacherId, classId, id)

      const submission = await submissionOf(id)
      expect(submission.status).toBe('approved')
      const [entry] = await database
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.id, submission.ledgerEntryId!))
      expect(entry).toMatchObject({
        type: 'quest_reward',
        xpDelta: 10,
        coinDelta: 4,
        sourceId: objectiveIds[0]
      })
      expect(await entriesOf(entry!.id)).toEqual([])
      expect(await balancesOf(studentId, classId)).toEqual({
        xp: 10,
        hp: HP_MAX,
        coins: 4
      })
    })

    test('adds the late penalty as an entry derived from the reward', async () => {
      const { teacherId, classId, objectiveIds, studentId } = await newScenario(
        [
          {
            dueOn: '2020-01-01',
            latePenaltyCoins: '3',
            latePenaltyHp: '5'
          }
        ]
      )
      const { id } = await objectiveSubmissionModel.submit(
        studentId,
        classId,
        objectiveIds[0]!,
        SUBMISSION
      )

      await objectiveSubmissionModel.approve(teacherId, classId, id)

      const { ledgerEntryId } = await submissionOf(id)
      expect(await entriesOf(ledgerEntryId!)).toMatchObject([
        { type: 'quest_penalty', xpDelta: 0, hpDelta: -5, coinDelta: -3 }
      ])
      expect(await balancesOf(studentId, classId)).toEqual({
        xp: 10,
        hp: HP_MAX - 5,
        coins: 1
      })
    })

    test('goes through once when two approvals arrive together', async () => {
      const { teacherId, classId, objectiveIds, studentId } =
        await newScenario()
      const { id } = await objectiveSubmissionModel.submit(
        studentId,
        classId,
        objectiveIds[0]!,
        SUBMISSION
      )

      const results = await Promise.allSettled([
        objectiveSubmissionModel.approve(teacherId, classId, id),
        objectiveSubmissionModel.approve(teacherId, classId, id)
      ])

      expect(
        results.filter(({ status }) => status === 'fulfilled')
      ).toHaveLength(1)
      const { xp } = await balancesOf(studentId, classId)
      expect(xp).toBe(10)
    })

    test('is refused for a student who left the class', async () => {
      const { teacherId, classId, objectiveIds, studentId } =
        await newScenario()
      const { id } = await objectiveSubmissionModel.submit(
        studentId,
        classId,
        objectiveIds[0]!,
        SUBMISSION
      )
      await enrollmentModel.remove(teacherId, classId, studentId)

      await expect(
        objectiveSubmissionModel.approve(teacherId, classId, id)
      ).rejects.toThrow(NotFoundError)
      const { status } = await submissionOf(id)
      expect(status).toBe('pending')
    })
  })

  test('reversing the reward from the history reverses the penalty and returns the submission', async () => {
    const { teacherId, classId, objectiveIds, studentId } = await newScenario(
      [{ dueOn: '2020-01-01', latePenaltyCoins: '3', latePenaltyHp: '5' }],
      { coins: 10 }
    )
    const { id } = await objectiveSubmissionModel.submit(
      studentId,
      classId,
      objectiveIds[0]!,
      SUBMISSION
    )
    await objectiveSubmissionModel.approve(teacherId, classId, id)
    const { ledgerEntryId } = await submissionOf(id)

    await ledgerModel.reverseEntry(teacherId, classId, ledgerEntryId!)

    expect(await balancesOf(studentId, classId)).toEqual({
      xp: 0,
      hp: HP_MAX,
      coins: 10
    })
    expect(await submissionOf(id)).toMatchObject({
      status: 'returned',
      teacherComment: null,
      ledgerEntryId
    })
    await expect(
      objectiveSubmissionModel.submit(
        studentId,
        classId,
        objectiveIds[0]!,
        SUBMISSION
      )
    ).resolves.toBeDefined()
  })

  describe('complete', () => {
    test('pays every selected student in one batch, with an approved submission without text', async () => {
      const {
        teacherId,
        classId,
        missionId,
        objectiveIds,
        studentId,
        newEnrolledStudent
      } = await newScenario([{ dueOn: '2020-01-01', latePenaltyHp: '5' }])
      const otherId = await newEnrolledStudent()

      await objectiveSubmissionModel.complete(
        teacherId,
        classId,
        missionId,
        objectiveIds[0]!,
        { studentIds: [studentId, otherId] }
      )

      for (const id of [studentId, otherId]) {
        // No late penalty on a completion
        expect(await balancesOf(id, classId)).toEqual({
          xp: 10,
          hp: HP_MAX,
          coins: 4
        })
      }
      const rows = await database
        .select()
        .from(objectiveSubmissions)
        .where(eq(objectiveSubmissions.objectiveId, objectiveIds[0]!))
      expect(rows).toHaveLength(2)
      expect(rows.every((row) => row.status === 'approved' && !row.text)).toBe(
        true
      )
      const batchIds = await database
        .selectDistinct({ batchId: ledgerEntries.batchId })
        .from(ledgerEntries)
        .where(eq(ledgerEntries.sourceId, objectiveIds[0]!))
      expect(batchIds).toHaveLength(1)
      // Undone per student from the history, so the submissions go back with the entries
      await expect(
        behaviorModel.undoAward(teacherId, classId, batchIds[0]!.batchId!)
      ).rejects.toThrow(NotFoundError)
    })

    test('reaches no student when one of them already sent the objective', async () => {
      const {
        teacherId,
        classId,
        missionId,
        objectiveIds,
        studentId,
        newEnrolledStudent
      } = await newScenario()
      const otherId = await newEnrolledStudent()
      await objectiveSubmissionModel.submit(
        otherId,
        classId,
        objectiveIds[0]!,
        SUBMISSION
      )

      await expect(
        objectiveSubmissionModel.complete(
          teacherId,
          classId,
          missionId,
          objectiveIds[0]!,
          { studentIds: [studentId, otherId] }
        )
      ).rejects.toThrow(ValidationError)
      const { xp } = await balancesOf(studentId, classId)
      expect(xp).toBe(0)
    })
  })

  test('lists the pending submissions of the class, marking the late ones', async () => {
    const { teacherId, classId, objectiveIds, studentId } = await newScenario([
      { dueOn: '2020-01-01' }
    ])
    await objectiveSubmissionModel.submit(
      studentId,
      classId,
      objectiveIds[0]!,
      {
        text: 'Fiz.',
        link: 'https://example.com/trabalho'
      }
    )

    const listed = await objectiveSubmissionModel.listPending(
      teacherId,
      classId
    )

    expect(listed?.submissions).toMatchObject([
      {
        missionName: 'A floresta',
        text: 'Fiz.',
        link: 'https://example.com/trabalho',
        late: true
      }
    ])
    expect(
      await objectiveSubmissionModel.countPending(teacherId, classId)
    ).toBe(1)
  })

  describe('findMissionForStudent', () => {
    test('gives each objective the state of its latest submission and hides the story of a locked one', async () => {
      const { teacherId, classId, missionId, objectiveIds, studentId } =
        await newScenario([{}, {}, {}])
      const [first, second] = objectiveIds as [string, string, string]
      const { id: returnedId } = await objectiveSubmissionModel.submit(
        studentId,
        classId,
        first,
        SUBMISSION
      )
      await objectiveSubmissionModel.returnSubmission(
        teacherId,
        classId,
        returnedId,
        { comment: 'Falta a fonte.' }
      )
      await objectiveSubmissionModel.submit(studentId, classId, first, {
        text: 'Agora com a fonte.',
        link: 'https://example.com'
      })

      const mission = await objectiveSubmissionModel.findMissionForStudent(
        studentId,
        classId,
        missionId
      )

      expect(mission).toMatchObject({
        approvedCount: 0,
        objectiveCount: 3,
        currentObjective: { id: second }
      })
      expect(mission!.objectives).toMatchObject([
        {
          state: 'pending',
          submission: {
            text: 'Agora com a fonte.',
            link: 'https://example.com',
            teacherComment: null
          }
        },
        { id: second, state: 'available' },
        { state: 'locked' }
      ])
      expect(mission!.objectives[2]).not.toHaveProperty('story')
    })

    test('leaves out a removed objective', async () => {
      const { teacherId, classId, missionId, objectiveIds, studentId } =
        await newScenario([{}, {}])
      await missionModel.removeObjective(
        teacherId,
        classId,
        missionId,
        objectiveIds[0]!
      )

      const mission = await objectiveSubmissionModel.findMissionForStudent(
        studentId,
        classId,
        missionId
      )

      expect(mission!.objectives).toMatchObject([
        { id: objectiveIds[1], state: 'available' }
      ])
    })

    test('finds neither a draft nor a mission of another class', async () => {
      const { teacherId, classId, studentId } = await newScenario()
      const other = await newScenario()
      const { id: draftId } = await missionModel.create(teacherId, classId, {
        name: 'Rascunho',
        description: ''
      })
      await missionModel.createObjective(
        teacherId,
        classId,
        draftId,
        newObjective()
      )

      expect(
        await objectiveSubmissionModel.findMissionForStudent(
          studentId,
          classId,
          draftId
        )
      ).toBeUndefined()
      expect(
        await objectiveSubmissionModel.findMissionForStudent(
          studentId,
          classId,
          other.missionId
        )
      ).toBeUndefined()
    })
  })

  describe('listMissionsForStudent', () => {
    test('counts the approved objectives and leaves the current one out once all are approved', async () => {
      const { teacherId, classId, missionId, objectiveIds, studentId } =
        await newScenario()
      await objectiveSubmissionModel.complete(
        teacherId,
        classId,
        missionId,
        objectiveIds[0]!,
        { studentIds: [studentId] }
      )

      expect(
        await objectiveSubmissionModel.listMissionsForStudent(
          studentId,
          classId
        )
      ).toMatchObject([
        { id: missionId, approvedCount: 1, currentObjective: undefined }
      ])
    })

    test('gives nothing to a student who left the class', async () => {
      const { teacherId, classId, studentId } = await newScenario()
      await enrollmentModel.remove(teacherId, classId, studentId)

      expect(
        await objectiveSubmissionModel.listMissionsForStudent(
          studentId,
          classId
        )
      ).toBeUndefined()
    })
  })
})
