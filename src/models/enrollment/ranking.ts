// Tied students share a position and the next one skips it (1, 1, 3), so a position is always one more
// than the number of classmates with more XP
export const rank = <Student extends { name: string; xp: number }>(
  students: Student[]
) => {
  const sorted = students.toSorted(
    // In the model because the collation of the database doesn't have to follow pt-BR
    (a, b) => b.xp - a.xp || a.name.localeCompare(b.name, 'pt-BR')
  )
  return sorted.map((student) => ({
    ...student,
    position: sorted.findIndex(({ xp }) => xp === student.xp) + 1
  }))
}
