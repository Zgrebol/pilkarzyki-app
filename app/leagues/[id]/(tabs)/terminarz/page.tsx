import { createClient } from '../../../../../utils/supabase/server'
import LineupEditor from '../../lineup-editor'
import { Card } from '@/app/components/ui/Card'
import { calcMatchScore } from '@/app/lib/match-score'

type Props = {
  params: Promise<{ id: string }>
}

function formatDateRange(dateFrom: string | null, dateTo: string | null): string {
  if (!dateFrom && !dateTo) return 'Termin nieustalony'
  if (dateFrom && !dateTo) {
    return new Date(dateFrom).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (!dateFrom && dateTo) {
    return `do ${new Date(dateTo).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  const from = new Date(dateFrom!)
  const to = new Date(dateTo!)
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    const monthYear = to.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
    return `${from.getDate()}–${to.getDate()} ${monthYear}`
  }
  const fromStr = from.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
  const toStr = to.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fromStr} – ${toStr}`
}

function PlayerScoreDisplay({
  name,
  result,
}: {
  name: string
  result: { goals: number; own_goals: number; match_finished: boolean } | undefined
}) {
  const goals = result?.goals ?? 0
  const og = result?.own_goals ?? 0
  const finished = result?.match_finished ?? false

  if (goals > 0) {
    return (
      <span className="font-bold text-white">
        {name}
        <span className="text-blue-400"> {goals}</span>
        {og > 0 && <span className="text-red-400 font-normal"> ({og} og)</span>}
      </span>
    )
  }
  if (finished) {
    return (
      <span className="text-gray-500 italic">
        {name}
        {og > 0 && <span className="text-red-400 not-italic"> ({og} og)</span>}
      </span>
    )
  }
  return (
    <span className="text-gray-500">
      {name}
      {og > 0 && <span className="text-red-400"> ({og} og)</span>}
    </span>
  )
}

export default async function TerminarzPage({ params }: Props) {
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

  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('id, status')
    .eq('league_id', id)
    .in('status', ['registration', 'locked'])
    .maybeSingle()

  if (currentSeason?.status !== 'locked') {
    return (
      <Card className="p-6 text-gray-400 text-sm">
        Terminarz będzie dostępny po zamknięciu zapisów.
      </Card>
    )
  }

  const [matchdaysRes, participantsRes] = await Promise.all([
    supabase
      .from('matchdays')
      .select('id, number, date_from, date_to, deadline')
      .eq('season_id', currentSeason.id)
      .order('number', { ascending: true }),
    supabase
      .from('season_participants')
      .select('id, tier, teams(name, owner_id, profiles(display_name))')
      .eq('season_id', currentSeason.id),
  ])

  const matchdays = matchdaysRes.data ?? []
  const seasonParticipants = participantsRes.data ?? []

  let lineupMap = new Map<string, any>()
  let rosterByParticipant = new Map<string, any[]>()
  let pairsByMatchday = new Map<string, any[]>()
  let byesByMatchday = new Map<string, any[]>()
  let resultsByMatchday = new Map<string, any[]>()
  let hasPairs = false

  const participantMap = new Map<string, { teamName: string; tier: number; ownerId: string | null }>()
  for (const p of seasonParticipants as any[]) {
    participantMap.set(p.id, {
      teamName: p.teams?.name ?? '(brak)',
      tier: p.tier ?? 1,
      ownerId: p.teams?.owner_id ?? null,
    })
  }

  if (matchdays.length > 0) {
    const matchdayIds = matchdays.map((m: any) => m.id)

    const [pairsRes, byesRes, resultsRes] = await Promise.all([
      supabase
        .from('matchday_pairs')
        .select('id, matchday_id, tier, home_participant_id, away_participant_id')
        .in('matchday_id', matchdayIds),
      supabase
        .from('matchday_byes')
        .select('id, matchday_id, tier, participant_id')
        .in('matchday_id', matchdayIds),
      supabase
        .from('match_results')
        .select('matchday_id, season_participant_id, roster_player_id, goals, own_goals, match_finished')
        .in('matchday_id', matchdayIds),
    ])

    hasPairs = (pairsRes.data ?? []).length > 0

    for (const pair of (pairsRes.data ?? []) as any[]) {
      const list = pairsByMatchday.get(pair.matchday_id) ?? []
      list.push(pair)
      pairsByMatchday.set(pair.matchday_id, list)
    }
    for (const bye of (byesRes.data ?? []) as any[]) {
      const list = byesByMatchday.get(bye.matchday_id) ?? []
      list.push(bye)
      byesByMatchday.set(bye.matchday_id, list)
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
      <h2 className="text-xl font-semibold mb-4">
        Terminarz{matchdays.length > 0 && ` (${matchdays.length} kolejek)`}
      </h2>

      {matchdays.length === 0 ? (
        <Card className="p-6 text-gray-400 text-sm">
          Brak kolejek. Terminarz generuje się automatycznie przy zamknięciu zapisów.
        </Card>
      ) : (
        <Card className="divide-y divide-gray-700">
          {matchdays.map((md: any) => {
            const deadline = md.deadline ? new Date(md.deadline) : null
            const deadlineNotPassed = !deadline || deadline > new Date()
            const mdPairs = pairsByMatchday.get(md.id) ?? []
            const mdByes = byesByMatchday.get(md.id) ?? []
            const hasBothTiers = new Set([
              ...mdPairs.map((p: any) => p.tier),
              ...mdByes.map((b: any) => b.tier),
            ]).size > 1

            const mdResultsLookup = new Map<string, { goals: number; own_goals: number; match_finished: boolean }>()
            const mdResultsParticipants = new Set<string>()
            for (const r of (resultsByMatchday.get(md.id) ?? []) as any[]) {
              mdResultsLookup.set(r.roster_player_id, { goals: r.goals, own_goals: r.own_goals, match_finished: r.match_finished ?? false })
              mdResultsParticipants.add(r.season_participant_id)
            }

            return (
              <div key={md.id}>
                {/* Matchday header */}
                <div className="px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                  <p className="font-semibold text-white">Kolejka {md.number}</p>
                  <p className="text-sm text-gray-400">{formatDateRange(md.date_from, md.date_to)}</p>
                </div>

                {hasPairs ? (
                  <div className="px-5 pb-4 pt-2 border-t border-gray-700/40">
                    {mdPairs.length === 0 && mdByes.length === 0 ? (
                      <p className="text-xs text-gray-600">Brak meczy w tej kolejce</p>
                    ) : (
                      <div className="space-y-4">
                        {[1, 2].map(tier => {
                          const tp = mdPairs.filter((p: any) => p.tier === tier)
                          const tb = mdByes.filter((b: any) => b.tier === tier)
                          if (tp.length === 0 && tb.length === 0) return null
                          return (
                            <div key={tier}>
                              {hasBothTiers && (
                                <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">
                                  Poziom {tier}
                                </p>
                              )}
                              <div className="space-y-3">
                                {tp.map((pair: any) => {
                                  const homeInfo = participantMap.get(pair.home_participant_id)
                                  const awayInfo = participantMap.get(pair.away_participant_id)
                                  const homeRoster = rosterByParticipant.get(pair.home_participant_id) ?? []
                                  const awayRoster = rosterByParticipant.get(pair.away_participant_id) ?? []
                                  const homeLineup = lineupMap.get(`${md.id}_${pair.home_participant_id}`) ?? null
                                  const awayLineup = lineupMap.get(`${md.id}_${pair.away_participant_id}`) ?? null
                                  const isHomeOwner = homeInfo?.ownerId === user?.id
                                  const isAwayOwner = awayInfo?.ownerId === user?.id
                                  const canEditHome = canModerate || (!!isHomeOwner && deadlineNotPassed)
                                  const canEditAway = canModerate || (!!isAwayOwner && deadlineNotPassed)

                                  const hasResults = mdResultsParticipants.has(pair.home_participant_id) ||
                                                     mdResultsParticipants.has(pair.away_participant_id)

                                  const hrm = new Map((homeRoster as any[]).map((p: any) => [p.id, p]))
                                  const arm = new Map((awayRoster as any[]).map((p: any) => [p.id, p]))
                                  const homeLineupPlayers = homeLineup
                                    ? [homeLineup.player1_id, homeLineup.player2_id, homeLineup.player3_id]
                                        .filter(Boolean).map((pid: string) => hrm.get(pid)).filter(Boolean) as any[]
                                    : []
                                  const awayLineupPlayers = awayLineup
                                    ? [awayLineup.player1_id, awayLineup.player2_id, awayLineup.player3_id]
                                        .filter(Boolean).map((pid: string) => arm.get(pid)).filter(Boolean) as any[]
                                    : []
                                  const homeGoalEntries = homeLineupPlayers.map((p: any) => mdResultsLookup.get(p.id) ?? { goals: 0, own_goals: 0 })
                                  const awayGoalEntries = awayLineupPlayers.map((p: any) => mdResultsLookup.get(p.id) ?? { goals: 0, own_goals: 0 })
                                  const { home: homeScore, away: awayScore } = calcMatchScore(homeGoalEntries, awayGoalEntries)

                                  return (
                                    <div key={pair.id}>
                                      {hasResults ? (
                                        <>
                                          <p className="text-base font-bold text-white">
                                            {homeInfo?.teamName ?? '?'}
                                            <span className="text-blue-400 mx-1.5">{homeScore}</span>
                                            <span className="text-gray-500 font-normal">–</span>
                                            <span className="text-blue-400 mx-1.5">{awayScore}</span>
                                            {awayInfo?.teamName ?? '?'}
                                          </p>
                                          {homeLineupPlayers.length === 3 && awayLineupPlayers.length === 3 && (
                                            <div className="text-sm text-gray-400 flex flex-wrap items-baseline gap-x-1 mt-0.5">
                                              <span>[</span>
                                              {homeLineupPlayers.map((p: any, i: number) => (
                                                <span key={p.id}>
                                                  <PlayerScoreDisplay name={p.full_name} result={mdResultsLookup.get(p.id)} />
                                                  {i < 2 && <span className="text-gray-600">,</span>}
                                                </span>
                                              ))}
                                              <span className="text-gray-600 select-none"> — </span>
                                              {awayLineupPlayers.map((p: any, i: number) => (
                                                <span key={p.id}>
                                                  <PlayerScoreDisplay name={p.full_name} result={mdResultsLookup.get(p.id)} />
                                                  {i < 2 && <span className="text-gray-600">,</span>}
                                                </span>
                                              ))}
                                              <span>]</span>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <p className="text-base font-bold text-white">
                                            {homeInfo?.teamName ?? '?'}
                                            <span className="text-gray-500 font-normal mx-1.5">vs</span>
                                            {awayInfo?.teamName ?? '?'}
                                          </p>
                                          <div className="text-sm text-gray-400 flex flex-wrap items-baseline gap-x-1 mt-0.5">
                                            <span>[</span>
                                            {homeRoster.length < 3 ? (
                                              <span className="text-yellow-600 text-xs">Skład niekompletny</span>
                                            ) : (
                                              <LineupEditor
                                                compact
                                                matchdayId={md.id}
                                                seasonParticipantId={pair.home_participant_id}
                                                currentLineup={homeLineup}
                                                rosterPlayers={homeRoster}
                                                canEdit={canEditHome}
                                              />
                                            )}
                                            <span className="text-gray-600 select-none"> — </span>
                                            {awayRoster.length < 3 ? (
                                              <span className="text-yellow-600 text-xs">Skład niekompletny</span>
                                            ) : (
                                              <LineupEditor
                                                compact
                                                matchdayId={md.id}
                                                seasonParticipantId={pair.away_participant_id}
                                                currentLineup={awayLineup}
                                                rosterPlayers={awayRoster}
                                                canEdit={canEditAway}
                                              />
                                            )}
                                            <span>]</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )
                                })}
                                {tb.map((bye: any) => (
                                  <p key={bye.id} className="text-xs text-gray-500">
                                    (Pauza: {participantMap.get(bye.participant_id)?.teamName ?? '?'})
                                  </p>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  seasonParticipants.length > 0 && (
                    <details className="px-5 pb-3">
                      <summary className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-300 mb-2">
                        Trójki meczowe ({seasonParticipants.length})
                      </summary>
                      <div className="mt-2 flex flex-col gap-2">
                        {(seasonParticipants as any[]).map((p: any) => {
                          const roster = rosterByParticipant.get(p.id) ?? []
                          const lineup = lineupMap.get(`${md.id}_${p.id}`) ?? null
                          const isOwner = p.teams?.owner_id === user?.id
                          const canEditLineup = canModerate || (isOwner && deadlineNotPassed)
                          return (
                            <div key={p.id} className="bg-gray-900 rounded p-3">
                              <div className="mb-2">
                                <p className="text-sm font-medium">{p.teams?.name ?? '(brak nazwy)'}</p>
                                <p className="text-xs text-gray-400">{p.teams?.profiles?.display_name ?? ''}</p>
                              </div>
                              {roster.length < 3 ? (
                                <p className="text-xs text-yellow-500">
                                  Skład niekompletny — potrzeba minimum 3 zawodników
                                </p>
                              ) : (
                                <LineupEditor
                                  matchdayId={md.id}
                                  seasonParticipantId={p.id}
                                  currentLineup={lineup}
                                  rosterPlayers={roster}
                                  canEdit={canEditLineup}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </details>
                  )
                )}
              </div>
            )
          })}
        </Card>
      )}
    </section>
  )
}
