import { createClient } from '../../../../../utils/supabase/server'
import MatchdayEditor from '../../matchday-editor'
import PairsManagement from '../terminarz/pairs-management'
import MatchResultsEditor from '../terminarz/match-results-editor'
import FillIronLineupsButton from '../../fill-iron-lineups-button'
import { Card } from '@/app/components/ui/Card'
import { calcMatchScore } from '@/app/lib/match-score'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EdytujTerminarzPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isSuperAdmin = false
  let myMembership: { role: string; status: string } | null = null

  if (user) {
    const [profileRes, memberRes] = await Promise.all([
      supabase.from('profiles').select('is_super_admin').eq('id', user.id).single(),
      supabase.from('league_members').select('role, status').eq('league_id', id).eq('user_id', user.id).maybeSingle(),
    ])
    isSuperAdmin = profileRes.data?.is_super_admin ?? false
    myMembership = memberRes.data
  }

  const canModerate = isSuperAdmin ||
    (myMembership?.status === 'active' &&
      (myMembership.role === 'admin' || myMembership.role === 'mod'))

  const iAmLeagueAdmin = myMembership?.status === 'active' && myMembership.role === 'admin'

  if (!canModerate) {
    return (
      <Card className="p-6">
        <p className="text-gray-400 text-sm">Brak dostępu. Ta strona jest dostępna tylko dla moderatorów.</p>
      </Card>
    )
  }

  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('id, status')
    .eq('league_id', id)
    .in('status', ['registration', 'locked'])
    .maybeSingle()

  if (currentSeason?.status !== 'locked') {
    return (
      <Card className="p-6 text-gray-400 text-sm">
        Panel moderatora będzie dostępny po zamknięciu zapisów.
      </Card>
    )
  }

  const [matchdaysRes, participantsRes, leagueRes] = await Promise.all([
    supabase
      .from('matchdays')
      .select('id, number, date_from, date_to, deadline')
      .eq('season_id', currentSeason.id)
      .order('number', { ascending: true }),
    supabase
      .from('season_participants')
      .select('id, tier, teams(name, owner_id, profiles(display_name))')
      .eq('season_id', currentSeason.id),
    supabase
      .from('leagues')
      .select('name')
      .eq('id', id)
      .maybeSingle(),
  ])

  const matchdays = matchdaysRes.data ?? []
  const seasonParticipants = participantsRes.data ?? []
  const leagueName = leagueRes.data?.name ?? ''

  let lineupMap = new Map<string, any>()
  let rosterByParticipant = new Map<string, any[]>()
  let pairsByMatchday = new Map<string, any[]>()
  let resultsByMatchday = new Map<string, any[]>()
  let hasPairs = false

  const participantMap = new Map<string, { teamName: string; tier: number }>()
  for (const p of seasonParticipants as any[]) {
    participantMap.set(p.id, {
      teamName: p.teams?.name ?? '(brak)',
      tier: p.tier ?? 1,
    })
  }

  const pairsParticipants = (seasonParticipants as any[]).map(p => ({
    id: p.id as string,
    tier: (p.tier ?? 1) as number,
    teamName: (p.teams?.name ?? '(brak)') as string,
  }))

  if (matchdays.length > 0) {
    const matchdayIds = matchdays.map((m: any) => m.id)

    const [pairsRes, resultsRes] = await Promise.all([
      supabase
        .from('matchday_pairs')
        .select('id, matchday_id, tier, home_participant_id, away_participant_id')
        .in('matchday_id', matchdayIds),
      supabase
        .from('match_results')
        .select('matchday_id, season_participant_id, roster_player_id, goals, own_goals')
        .in('matchday_id', matchdayIds),
    ])

    hasPairs = (pairsRes.data ?? []).length > 0

    for (const pair of (pairsRes.data ?? []) as any[]) {
      const list = pairsByMatchday.get(pair.matchday_id) ?? []
      list.push(pair)
      pairsByMatchday.set(pair.matchday_id, list)
    }
    for (const r of (resultsRes.data ?? []) as any[]) {
      const list = resultsByMatchday.get(r.matchday_id) ?? []
      list.push(r)
      resultsByMatchday.set(r.matchday_id, list)
    }

    if (seasonParticipants.length > 0) {
      const participantIds = seasonParticipants.map((p: any) => p.id)

      const [lineupsRes, playersRes] = await Promise.all([
        supabase
          .from('matchday_lineups')
          .select('matchday_id, season_participant_id, player1_id, player2_id, player3_id, is_iron')
          .in('matchday_id', matchdayIds),
        supabase
          .from('roster_players')
          .select('id, season_participant_id, full_name, club, position, league')
          .in('season_participant_id', participantIds),
      ])

      for (const l of (lineupsRes.data ?? []) as any[]) {
        lineupMap.set(`${l.matchday_id}_${l.season_participant_id}`, l)
      }
      for (const player of (playersRes.data ?? []) as any[]) {
        const list = rosterByParticipant.get(player.season_participant_id) ?? []
        list.push(player)
        rosterByParticipant.set(player.season_participant_id, list)
      }
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-xl font-semibold">Edytuj terminarz</h2>
        <FillIronLineupsButton seasonId={currentSeason.id} />
      </div>

      <PairsManagement
        seasonId={currentSeason.id}
        participants={pairsParticipants}
        hasPairs={hasPairs}
        canGenerate
        isSuperAdmin={isSuperAdmin}
        leagueName={leagueName}
      />

      {matchdays.length === 0 ? (
        <Card className="p-6 text-gray-400 text-sm mt-4">
          Brak kolejek.
        </Card>
      ) : (
        <Card className="divide-y divide-gray-700 mt-4">
          {matchdays.map((md: any) => {
            const mdPairs = pairsByMatchday.get(md.id) ?? []

            const editorPairs = mdPairs.map((pair: any) => {
              const hl = lineupMap.get(`${md.id}_${pair.home_participant_id}`)
              const al = lineupMap.get(`${md.id}_${pair.away_participant_id}`)
              if (!hl || !al) return null
              const hrm = new Map((rosterByParticipant.get(pair.home_participant_id) ?? []).map((p: any) => [p.id, p]))
              const arm = new Map((rosterByParticipant.get(pair.away_participant_id) ?? []).map((p: any) => [p.id, p]))
              const hp = [hl.player1_id, hl.player2_id, hl.player3_id]
                .filter(Boolean)
                .map((pid: string) => { const p = hrm.get(pid); return p ? { id: p.id as string, full_name: p.full_name as string, participantId: pair.home_participant_id as string } : null })
                .filter((x): x is { id: string; full_name: string; participantId: string } => x !== null)
              const ap = [al.player1_id, al.player2_id, al.player3_id]
                .filter(Boolean)
                .map((pid: string) => { const p = arm.get(pid); return p ? { id: p.id as string, full_name: p.full_name as string, participantId: pair.away_participant_id as string } : null })
                .filter((x): x is { id: string; full_name: string; participantId: string } => x !== null)
              if (hp.length !== 3 || ap.length !== 3) return null
              return {
                pairId: pair.id as string,
                homeParticipantId: pair.home_participant_id as string,
                homeTeamName: participantMap.get(pair.home_participant_id)?.teamName ?? '?',
                homePlayers: hp,
                awayParticipantId: pair.away_participant_id as string,
                awayTeamName: participantMap.get(pair.away_participant_id)?.teamName ?? '?',
                awayPlayers: ap,
              }
            }).filter((p): p is NonNullable<typeof p> => p !== null)

            return (
              <div key={md.id}>
                <MatchdayEditor
                  matchday={md}
                  canEdit={iAmLeagueAdmin || isSuperAdmin}
                />
                {hasPairs && editorPairs.length > 0 && (
                  <div className="px-5 pb-4">
                    <MatchResultsEditor
                      matchdayId={md.id}
                      pairs={editorPairs}
                      existingResults={resultsByMatchday.get(md.id) ?? []}
                      canEdit
                    />
                  </div>
                )}
              </div>
            )
          })}
        </Card>
      )}
    </section>
  )
}
