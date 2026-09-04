import { createClient } from '../../../../../utils/supabase/server'
import MatchdayEditor from '../../matchday-editor'
import LineupEditor from '../../lineup-editor'

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

  const [matchdaysRes, participantsRes] = await Promise.all([
    supabase
      .from('matchdays')
      .select('id, number, date_from, date_to, deadline')
      .eq('season_id', currentSeason.id)
      .order('number', { ascending: true }),
    supabase
      .from('season_participants')
      .select('id, teams(name, owner_id, profiles(display_name))')
      .eq('season_id', currentSeason.id),
  ])

  const matchdays = matchdaysRes.data ?? []
  const seasonParticipants = participantsRes.data ?? []

  let lineupMap = new Map<string, any>()
  let rosterByParticipant = new Map<string, any[]>()

  if (matchdays.length > 0 && seasonParticipants.length > 0) {
    const participantIds = seasonParticipants.map((p: any) => p.id)

    const [lineupsRes, playersRes] = await Promise.all([
      supabase
        .from('matchday_lineups')
        .select('matchday_id, season_participant_id, player1_id, player2_id, player3_id, is_iron')
        .in('matchday_id', matchdays.map((m: any) => m.id)),
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

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">
        Terminarz{matchdays.length > 0 && ` (${matchdays.length} kolejek)`}
      </h2>
      {matchdays.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-gray-400 text-sm">
          Brak kolejek. Aby wygenerować terminarz, otwórz zapisy ponownie i zamknij je jeszcze raz.
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
          {matchdays.map((md: any) => {
            const deadline = md.deadline ? new Date(md.deadline) : null
            const deadlineNotPassed = !deadline || deadline > new Date()
            return (
              <div key={md.id}>
                <MatchdayEditor
                  matchday={md}
                  canEdit={iAmLeagueAdmin || isSuperAdmin}
                />
                {seasonParticipants.length > 0 && (
                  <details className="px-5 pb-3">
                    <summary className="text-xs text-gray-400 cursor-pointer select-none hover:text-gray-300 mb-2">
                      Trójki meczowe ({seasonParticipants.length})
                    </summary>
                    <div className="mt-2 flex flex-col gap-2">
                      {seasonParticipants.map((p: any) => {
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
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
