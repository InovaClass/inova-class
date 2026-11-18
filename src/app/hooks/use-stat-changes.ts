import { useState } from 'react'

import {
  type StatChange,
  statChangeOf,
  type StatsSnapshot
} from '@/app/helpers/stat-change'

export type IdentifiedStatChange = StatChange & { id: number }

type State = {
  previous: StatsSnapshot
  changes: IdentifiedStatChange[]
  nextId: number
  // Kept apart from the list, since the level-up outlasts the numbers of its change
  levelUp?: { id: number; level: number }
}

// One state, updated from the current value: a render that a transition restarts would otherwise
// add the same change twice
const record = (state: State, stats: StatsSnapshot): State => {
  const change = statChangeOf(state.previous, stats)
  if (!change) return state
  const id = state.nextId
  return {
    previous: stats,
    changes: [...state.changes, { ...change, id }],
    nextId: id + 1,
    levelUp: change.levelReached
      ? { id, level: change.levelReached }
      : state.levelUp
  }
}

// The class events carry no data (see Class events in AGENTS.md), so a change is told apart by
// comparing the values the page renders with the ones it rendered before
export const useStatChanges = (stats: StatsSnapshot) => {
  const [state, setState] = useState<State>({
    previous: stats,
    changes: [],
    nextId: 0
  })

  if (statChangeOf(state.previous, stats)) {
    setState((current) => record(current, stats))
  }

  const dismiss = (id: number) =>
    setState((current) => ({
      ...current,
      changes: current.changes.filter((change) => change.id !== id)
    }))

  const dismissLevelUp = () =>
    setState((current) => ({ ...current, levelUp: undefined }))

  return {
    changes: state.changes,
    latest: state.changes.at(-1),
    dismiss,
    levelUp: state.levelUp,
    dismissLevelUp
  }
}
