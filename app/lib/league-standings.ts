export type ParticipantInput = {
  id: string
  team_name: string
  draft_position: number | null
  manual_position_override: number | null
}

export type MatchInput = {
  home_participant_id: string
  away_participant_id: string
  home_score: number
  away_score: number
}

export type StandingRow = {
  participant_id: string
  team_name: string
  position: number
  is_manual: boolean
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  points: number
}

export function calculateStandings(
  participants: ParticipantInput[],
  matches: MatchInput[]
): StandingRow[] {
  type Stats = { played: number; wins: number; draws: number; losses: number; goals_for: number; goals_against: number; points: number }
  const stats = new Map<string, Stats>()
  for (const p of participants) {
    stats.set(p.id, { played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, points: 0 })
  }

  for (const m of matches) {
    const h = stats.get(m.home_participant_id)
    const a = stats.get(m.away_participant_id)
    if (!h || !a) continue
    h.played++; a.played++
    h.goals_for += m.home_score; h.goals_against += m.away_score
    a.goals_for += m.away_score; a.goals_against += m.home_score
    if (m.home_score > m.away_score) { h.wins++; h.points += 3; a.losses++ }
    else if (m.home_score < m.away_score) { a.wins++; a.points += 3; h.losses++ }
    else { h.draws++; h.points++; a.draws++; a.points++ }
  }

  const opponentPoints = new Map<string, number>()
  for (const p of participants) {
    let opp = 0
    for (const m of matches) {
      if (m.home_participant_id === p.id) opp += stats.get(m.away_participant_id)?.points ?? 0
      else if (m.away_participant_id === p.id) opp += stats.get(m.home_participant_id)?.points ?? 0
    }
    opponentPoints.set(p.id, opp)
  }

  const sorted = [...participants].sort((a, b) => {
    const sa = stats.get(a.id)!
    const sb = stats.get(b.id)!
    if (sb.points !== sa.points) return sb.points - sa.points
    if (sb.goals_for !== sa.goals_for) return sb.goals_for - sa.goals_for
    if (sb.goals_against !== sa.goals_against) return sb.goals_against - sa.goals_against
    if (sb.wins !== sa.wins) return sb.wins - sa.wins
    const oppA = opponentPoints.get(a.id) ?? 0
    const oppB = opponentPoints.get(b.id) ?? 0
    if (oppB !== oppA) return oppB - oppA
    const dpA = a.draft_position ?? 999
    const dpB = b.draft_position ?? 999
    if (dpA !== dpB) return dpA - dpB
    return a.id.localeCompare(b.id)
  })

  const rows: StandingRow[] = sorted.map((p, i) => {
    const s = stats.get(p.id)!
    return { participant_id: p.id, team_name: p.team_name, position: i + 1, is_manual: false, ...s }
  })

  const withOverride = participants
    .filter(p => p.manual_position_override != null)
    .sort((a, b) => (a.manual_position_override! - b.manual_position_override!) || a.id.localeCompare(b.id))

  for (const p of withOverride) {
    const idx = rows.findIndex(r => r.participant_id === p.id)
    if (idx === -1) continue
    const [row] = rows.splice(idx, 1)
    const insertAt = Math.min(p.manual_position_override! - 1, rows.length)
    rows.splice(insertAt, 0, { ...row, is_manual: true })
  }

  rows.forEach((r, i) => { r.position = i + 1 })
  return rows
}
