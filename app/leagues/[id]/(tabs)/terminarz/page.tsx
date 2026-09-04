import { createClient } from '../../../../../utils/supabase/server'
import MatchdayEditor from '../../matchday-editor'
import LineupEditor from '../../lineup-editor'
import PairsManagement from './pairs-management'

type Props = {
  params: Promise<{ id: string }>
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

  const iAmLeagueAdmin = myMembership?.status === 'active' && myMembership.role === 'admin'

  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('id, status')
    .eq('league_id', id)
    .in('status', ['registration', 'locked'])
    .maybeSingle()

  if (currentSeason?.status !== 'locked') {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-gray-400 text-sm">
        Terminarz będzie dostępny po zamknięciu zapisów.
      </div>
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
  let byesByMatchday = new Map<string, any[]>()
  let hasPairs = false

  // Mapa uczestnik_id → {teamName, tier, ownerId}
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

    // Pary i pauzy (niezależnie od liczby uczestników)
    const [pairsRes, byesRes] = await Promise.all([
      supabase
        .from('matchday_pairs')
        .select('id, matchday_id, tier, home_participant_id, away_participant_id')
        .in('matchday_id', matchdayIds),
      supabase
        .from('matchday_byes')
        .select('id, matchday_id, tier, participant_id')
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

  const pairsParticipants = (seasonParticipants as any[]).map(p => ({
    id: p.id as string,
    tier: (p.tier ?? 1) as number,
    teamName: (p.teams?.name ?? '(brak)') as string,
  }))

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">
        Terminarz{matchdays.length > 0 && ` (${matchdays.length} kolejek)`}
      </h2>

      {/* Panel zarządzania parami — widoczny gdy sezon zamknięty i jest co zarządzać */}
      {(canModerate || isSuperAdmin) && (
        <PairsManagement
          seasonId={currentSeason.id}
          participants={pairsParticipants}
          hasPairs={hasPairs}
          canGenerate={canModerate || isSuperAdmin}
          isSuperAdmin={isSuperAdmin}
          leagueName={leagueName}
        />
      )}

      {matchdays.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-gray-400 text-sm">
          Brak kolejek. Aby wygenerować terminarz, otwórz zapisy ponownie i zamknij je jeszcze raz.
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
          {matchdays.map((md: any) => {
            const deadline = md.deadline ? new Date(md.deadline) : null
            const deadlineNotPassed = !deadline || deadline > new Date()
            const mdPairs = pairsByMatchday.get(md.id) ?? []
            const mdByes = byesByMatchday.get(md.id) ?? []
            const hasBothTiers = new Set([
              ...mdPairs.map((p: any) => p.tier),
              ...mdByes.map((b: any) => b.tier),
            ]).size > 1

            return (
              <div key={md.id}>
                <MatchdayEditor
                  matchday={md}
                  canEdit={iAmLeagueAdmin || isSuperAdmin}
                />

                {hasPairs ? (
                  /* ── NOWY WIDOK: pary z trójkami inline ── */
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

                                  return (
                                    <div key={pair.id}>
                                      {/* Linia 1: nazwy drużyn */}
                                      <p className="text-sm font-medium text-white">
                                        {homeInfo?.teamName ?? '?'}
                                        <span className="text-gray-500 mx-1.5">-</span>
                                        {awayInfo?.teamName ?? '?'}
                                      </p>
                                      {/* Linia 2: trójki w nawiasach */}
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
                  /* ── FALLBACK: stary widok gdy pary nie istnieją ── */
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
        </div>
      )}
    </section>
  )
}
