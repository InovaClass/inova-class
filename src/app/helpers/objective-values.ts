import { describeBehaviorValues } from './behavior-values'

type ObjectiveValues = {
  dueOn: string | null
  xpReward: number
  coinReward: number
  latePenaltyCoins: number
  latePenaltyHp: number
}

// `dueOn` is a day without a time zone, so it's read as UTC to never move to the day before
const DUE_ON_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeZone: 'UTC'
})

export const formatDueOn = (dueOn: string) =>
  DUE_ON_FORMAT.format(new Date(`${dueOn}T00:00:00Z`))

export const describeObjectiveReward = ({
  xpReward,
  coinReward
}: ObjectiveValues) =>
  describeBehaviorValues({ xp: xpReward, hp: 0, coins: coinReward })

export const describeLatePenalty = ({
  latePenaltyCoins,
  latePenaltyHp
}: ObjectiveValues) =>
  describeBehaviorValues({
    xp: 0,
    hp: -latePenaltyHp,
    coins: -latePenaltyCoins
  })
