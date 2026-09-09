export type ScorerInput = {
  roster_player_id: string
  full_name: string
  team_name: string
  goals: number
}

export type ScorerRow = {
  position: number
  full_name: string
  team_name: string
  goals: number
}

export function calculateScorersRanking(scorers: ScorerInput[]): ScorerRow[] {
  const agg = new Map<string, { full_name: string; team_name: string; goals: number }>()
  for (const s of scorers) {
    const cur = agg.get(s.roster_player_id) ?? { full_name: s.full_name, team_name: s.team_name, goals: 0 }
    cur.goals += s.goals
    agg.set(s.roster_player_id, cur)
  }

  const sorted = [...agg.values()]
    .filter(s => s.goals > 0)
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals
      return a.full_name.localeCompare(b.full_name)
    })

  return sorted.map((s, i) => ({ position: i + 1, ...s }))
}
