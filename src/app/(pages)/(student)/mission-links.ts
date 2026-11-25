export const objectiveAnchorOf = (objectiveId: string) =>
  `objetivo-${objectiveId}`

export const missionPathOf = (
  classId: string,
  missionId: string,
  objectiveId?: string
) =>
  `/aluno/turmas/${classId}/missoes/${missionId}${objectiveId ? `#${objectiveAnchorOf(objectiveId)}` : ''}`

export const describeMissionProgress = ({
  approvedCount,
  objectiveCount
}: {
  approvedCount: number
  objectiveCount: number
}) =>
  `${approvedCount}/${objectiveCount} ${objectiveCount === 1 ? 'objetivo concluído' : 'objetivos concluídos'}`
