import { createClient } from '../../../../../utils/supabase/server'
import { Card } from '@/app/components/ui/Card'
import { calculateScorersRanking } from '@/app/lib/scorers-ranking'

type Props = {
  params: Promise<{ id: string }>
}

export default async function StrzelcyPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('league_id', id)
    .eq('status', 'locked')
    .maybeSingle()

  if (!currentSeason) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Ranking strzelców</h2>
        <p className="text-gray-400 text-sm">Ranking pojawi się po rozpoczęciu sezonu.</p>
      </Card>
    )
  }

  const { data: matchdays } = await supabase
    .from('matchdays')
    .select('id')
    .eq('season_id', currentSeason.id)

  const matchdayIds = (matchdays ?? []).map((m: any) => m.id)

  if (matchdayIds.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Ranking strzelców</h2>
        <p className="text-gray-400 text-sm">Ranking pojawi się gdy pojawią się pierwsze wyniki.</p>
      </Card>
    )
  }

  const { data: participants } = await supabase
    .from('season_participants')
    .select('id, teams(name)')
    .eq('season_id', currentSeason.id)

  const participantIds = (participants ?? []).map((p: any) => p.id)
  const teamNameMap = new Map<string, string>(
    (participants ?? []).map((p: any) => [p.id, p.teams?.name ?? '(brak)'])
  )

  const [resultsRes, playersRes] = await Promise.all([
    supabase
      .from('match_results')
      .select('roster_player_id, season_participant_id, goals')
      .in('matchday_id', matchdayIds)
      .gt('goals', 0),
    supabase
      .from('roster_players')
      .select('id, full_name, season_participant_id')
      .in('season_participant_id', participantIds),
  ])

  const playerMap = new Map<string, { full_name: string; season_participant_id: string }>(
    (playersRes.data ?? []).map((p: any) => [p.id, { full_name: p.full_name, season_participant_id: p.season_participant_id }])
  )

  const scorerInputs = (resultsRes.data ?? []).map((r: any) => {
    const player = playerMap.get(r.roster_player_id)
    return {
      roster_player_id: r.roster_player_id,
      full_name: player?.full_name ?? '?',
      team_name: teamNameMap.get(r.season_participant_id) ?? '?',
      goals: r.goals as number,
    }
  })

  const ranking = calculateScorersRanking(scorerInputs)

  if (ranking.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Ranking strzelców</h2>
        <p className="text-gray-400 text-sm">Ranking pojawi się gdy pojawią się pierwsze wyniki.</p>
      </Card>
    )
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Ranking strzelców</h2>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700/30 text-xs uppercase tracking-wide text-gray-400">
                <th className="text-right px-3 py-2 w-10">#</th>
                <th className="text-left px-3 py-2">Zawodnik</th>
                <th className="text-left px-3 py-2">Drużyna</th>
                <th className="text-right px-3 py-2 w-16">Gole</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {ranking.map(row => (
                <tr key={`${row.full_name}-${row.team_name}`} className="hover:bg-gray-800/30 transition-colors">
                  <td className="text-right px-3 py-2.5 text-gray-400 tabular-nums">{row.position}</td>
                  <td className="px-3 py-2.5 font-medium text-white">{row.full_name}</td>
                  <td className="px-3 py-2.5 text-gray-400">{row.team_name}</td>
                  <td className="text-right px-3 py-2.5 font-bold text-white tabular-nums">{row.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}
