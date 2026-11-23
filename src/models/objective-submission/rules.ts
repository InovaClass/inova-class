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
