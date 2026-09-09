export function calcMatchScore(
  homeEntries: { goals: number; own_goals: number }[],
  awayEntries: { goals: number; own_goals: number }[]
): { home: number; away: number } {
  const sum = (arr: { goals: number; own_goals: number }[], f: 'goals' | 'own_goals') =>
    arr.reduce((s, r) => s + r[f], 0)
  return {
    home: sum(homeEntries, 'goals') + sum(awayEntries, 'own_goals'),
    away: sum(awayEntries, 'goals') + sum(homeEntries, 'own_goals'),
  }
}
