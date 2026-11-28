import type { ObjectiveSubmissionStatus } from '@/constants/game'

// `en-CA` formats as YYYY-MM-DD, the same form as a `date` column, so the two compare as strings
const SAO_PAULO_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

// The teacher picks a day, so a submission is late only from the next day in São Paulo (#94)
export const isLate = (submittedAt: Date, dueOn: string | null) =>
  dueOn !== null && SAO_PAULO_DAY.format(submittedAt) > dueOn

export const latePenaltyOf = (
  objective: {
    dueOn: string | null
    latePenaltyCoins: number
    latePenaltyHp: number
  },
  submittedAt: Date
) => {
  const { latePenaltyCoins: coins, latePenaltyHp: hp } = objective
  if (coins + hp === 0 || !isLate(submittedAt, objective.dueOn)) return
  return { coins, hp }
}

// Any submission of the previous objective opens the next one, returned ones included, so a slow
// review never blocks the student (#95)
export const isAvailable = (
  objectiveIds: readonly string[],
  submittedObjectiveIds: ReadonlySet<string>,
  objectiveId: string
) => {
  const index = objectiveIds.indexOf(objectiveId)
  if (index === -1) return false
  return index === 0 || submittedObjectiveIds.has(objectiveIds[index - 1]!)
}

// The same test as `objectiveStatesOf` for a single objective: anything but `locked`
export const isUnlocked = (
  {
    objectiveIds,
    submittedObjectiveIds,
    hasOpenSubmission
  }: {
    objectiveIds: readonly string[]
    submittedObjectiveIds: ReadonlySet<string>
    hasOpenSubmission: boolean
  },
  objectiveId: string
) =>
  hasOpenSubmission ||
  isAvailable(objectiveIds, submittedObjectiveIds, objectiveId)

export type ObjectiveState =
  'locked' | 'available' | 'pending' | 'returned' | 'approved'

// A returned objective goes back to locked when the previous one has no submission (the teacher
// moved it), since the student couldn't send it again
export const objectiveStatesOf = (
  objectiveIds: readonly string[],
  latestStatuses: ReadonlyMap<string, ObjectiveSubmissionStatus>
): ObjectiveState[] => {
  const submittedObjectiveIds = new Set(latestStatuses.keys())
  return objectiveIds.map((objectiveId) => {
    const status = latestStatuses.get(objectiveId)
    if (status === 'pending' || status === 'approved') return status
    if (!isAvailable(objectiveIds, submittedObjectiveIds, objectiveId)) {
      return 'locked'
    }
    return status ?? 'available'
  })
}

// The link leads to what the student can do now, and only to a submission waiting for the teacher
// when there's nothing left to send
export const currentObjectiveIndex = (states: readonly ObjectiveState[]) => {
  const sendable = states.findIndex(
    (state) => state === 'available' || state === 'returned'
  )
  return sendable === -1 ? states.indexOf('pending') : sendable
}
