import { createClient } from '../../../../utils/supabase/server'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'
import { calculateStandings } from '@/app/lib/league-standings'
import { calcMatchScore } from '@/app/lib/match-score'
import ManualPositionEditor from './manual-position-editor'

type Props = {
  params: Promise<{ id: string }>
}

function Diff({ value }: { value: number }) {
  if (value > 0) return <span className="text-green-400">+{value}</span>
  if (value < 0) return <span className="text-red-400">{value}</span>
  return <span className="text-gray-500">0</span>
}

export default async function LeagueMainPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isSuperAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle()
    isSuperAdmin = profile?.is_super_admin ?? false
  }

  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('league_id', id)
    .eq('status', 'locked')
    .maybeSingle()

  if (!currentSeason) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Tabela ligowa</h2>
        <p className="text-gray-400 text-sm">Tabela pojawi się po rozpoczęciu sezonu.</p>
      </Card>
    )
  }

  const [participantsRes, matchdaysRes] = await Promise.all([
    supabase
      .from('season_participants')
      .select('id, draft_position, manual_position_override, teams(name)')
      .eq('season_id', currentSeason.id),
    supabase
      .from('matchdays')
      .select('id')
      .eq('season_id', currentSeason.id),
  ])

  const participantsRaw = participantsRes.data ?? []
  const matchdays = matchdaysRes.data ?? []
  const matchdayIds = matchdays.map((m: any) => m.id)

  if (matchdayIds.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Tabela ligowa</h2>
        <p className="text-gray-400 text-sm">Tabela pojawi się gdy pojawią się pierwsze wyniki.</p>
      </Card>
    )
  }

  const [pairsRes, resultsRes] = await Promise.all([
    supabase
      .from('matchday_pairs')
      .select('matchday_id, home_participant_id, away_participant_id')
      .in('matchday_id', matchdayIds),
    supabase
      .from('match_results')
      .select('matchday_id, season_participant_id, goals, own_goals')
      .in('matchday_id', matchdayIds),
  ])

  const resultsByMatchday = new Map<string, any[]>()
  for (const r of (resultsRes.data ?? []) as any[]) {
    const list = resultsByMatchday.get(r.matchday_id) ?? []
    list.push(r)
    resultsByMatchday.set(r.matchday_id, list)
  }

  const matchInputs: { home_participant_id: string; away_participant_id: string; home_score: number; away_score: number }[] = []
  for (const pair of (pairsRes.data ?? []) as any[]) {
    const mdResults = resultsByMatchday.get(pair.matchday_id) ?? []
    const homeEntries = mdResults.filter((r: any) => r.season_participant_id === pair.home_participant_id)
    const awayEntries = mdResults.filter((r: any) => r.season_participant_id === pair.away_participant_id)
    if (homeEntries.length > 0 && awayEntries.length > 0) {
      const { home, away } = calcMatchScore(homeEntries, awayEntries)
      matchInputs.push({
        home_participant_id: pair.home_participant_id,
        away_participant_id: pair.away_participant_id,
        home_score: home,
        away_score: away,
      })
    }
  }

  if (matchInputs.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Tabela ligowa</h2>
        <p className="text-gray-400 text-sm">Tabela pojawi się gdy pojawią się pierwsze wyniki.</p>
      </Card>
    )
  }

  const participants = participantsRaw.map((p: any) => ({
    id: p.id as string,
    team_name: (p.teams?.name ?? '(brak)') as string,
    draft_position: (p.draft_position ?? null) as number | null,
    manual_position_override: (p.manual_position_override ?? null) as number | null,
  }))

  const standings = calculateStandings(participants, matchInputs)
  const total = standings.length

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Tabela ligowa</h2>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700/30 text-xs uppercase tracking-wide text-gray-400">
                <th className="text-right px-3 py-2 w-10">#</th>
                <th className="text-left px-3 py-2">Drużyna</th>
                <th className="text-right px-2 py-2 w-10">M</th>
                <th className="text-right px-2 py-2 w-10">W</th>
                <th className="text-right px-2 py-2 w-10">R</th>
                <th className="text-right px-2 py-2 w-10">P</th>
                <th className="text-right px-2 py-2 w-12">B+</th>
                <th className="text-right px-2 py-2 w-12">B-</th>
                <th className="text-right px-2 py-2 w-14">+/-</th>
                <th className="text-right px-3 py-2 w-14">Pkt</th>
                {isSuperAdmin && <th className="w-28 px-2 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {standings.map(row => {
                const bg = row.position <= 4
                  ? 'bg-green-900/20 hover:bg-green-900/30'
                  : total >= 5 && row.position > total - 4
                    ? 'bg-red-900/20 hover:bg-red-900/30'
                    : 'hover:bg-gray-800/30'
                return (
                <tr key={row.participant_id} className={`transition-colors ${bg}`}>
                  <td className="text-right px-3 py-2.5 text-gray-400 tabular-nums">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.is_manual && (
                        <Badge variant="warning" className="text-[10px] px-1 py-0">ręczna</Badge>
                      )}
                      {row.position}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-white">{row.team_name}</td>
                  <td className="text-right px-2 py-2.5 text-gray-400 tabular-nums">{row.played}</td>
                  <td className="text-right px-2 py-2.5 text-gray-400 tabular-nums">{row.wins}</td>
                  <td className="text-right px-2 py-2.5 text-gray-400 tabular-nums">{row.draws}</td>
                  <td className="text-right px-2 py-2.5 text-gray-400 tabular-nums">{row.losses}</td>
                  <td className="text-right px-2 py-2.5 text-gray-400 tabular-nums">{row.goals_for}</td>
                  <td className="text-right px-2 py-2.5 text-gray-400 tabular-nums">{row.goals_against}</td>
                  <td className="text-right px-2 py-2.5 tabular-nums">
                    <Diff value={row.goals_for - row.goals_against} />
                  </td>
                  <td className="text-right px-3 py-2.5 font-bold text-white tabular-nums">{row.points}</td>
                  {isSuperAdmin && (
                    <td className="px-2 py-2 text-right">
                      <ManualPositionEditor
                        participantId={row.participant_id}
                        currentOverride={participants.find(p => p.id === row.participant_id)?.manual_position_override ?? null}
                        totalParticipants={total}
                      />
                    </td>
                  )}
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {isSuperAdmin && (
        <p className="text-xs text-gray-600 mt-2">
          Ręczne nadpisanie pozycji jest kasowane automatycznie przy każdym zapisie nowych wyników.
        </p>
      )}
    </section>
  )
}
