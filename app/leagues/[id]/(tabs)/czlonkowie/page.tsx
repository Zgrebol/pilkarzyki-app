import { createClient } from '../../../../../utils/supabase/server'
import MemberRoleControls from '../../member-role-controls'
import RosterManagement from '../../roster-management'

type Props = {
  params: Promise<{ id: string }>
}

function roleBadge(role: string) {
  if (role === 'admin') return { label: '👑 admin', cls: 'bg-yellow-600' }
  if (role === 'mod') return { label: '🛡️ mod', cls: 'bg-blue-600' }
  return { label: '⚽ gracz', cls: 'bg-gray-700' }
}

export default async function CzlonkowiePage({ params }: Props) {
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
  const canManageRoles = iAmLeagueAdmin || isSuperAdmin

  const { data: members } = await supabase
    .from('league_members')
    .select('id, user_id, role, status, joined_at, profiles(display_name)')
    .eq('league_id', id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  const { data: teamsData } = await supabase
    .from('teams')
    .select('owner_id, name')
    .eq('league_id', id)

  const teamByOwner = new Map<string, string>(
    (teamsData ?? []).map((t: any) => [t.owner_id, t.name])
  )

  const memberCount = members?.length ?? 0

  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('id, status')
    .eq('league_id', id)
    .in('status', ['registration', 'locked'])
    .maybeSingle()

  let seasonParticipants: any[] = []
  let rosterByParticipant = new Map<string, any[]>()

  if (currentSeason?.status === 'locked') {
    const { data: participantsData } = await supabase
      .from('season_participants')
      .select('id, teams(name, owner_id, profiles(display_name))')
      .eq('season_id', currentSeason.id)

    seasonParticipants = participantsData ?? []

    const participantIds = seasonParticipants.map((p: any) => p.id)
    if (participantIds.length > 0) {
      const { data: allPlayers } = await supabase
        .from('roster_players')
        .select('id, season_participant_id, full_name, club, position, league')
        .in('season_participant_id', participantIds)

      for (const player of (allPlayers ?? []) as any[]) {
        const list = rosterByParticipant.get(player.season_participant_id) ?? []
        list.push(player)
        rosterByParticipant.set(player.season_participant_id, list)
      }
    }
  }

  return (
    <>
      <section>
        <h2 className="text-xl font-semibold mb-4">Członkowie ({memberCount})</h2>
        {memberCount === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-gray-400 text-sm">
            W lidze nie ma jeszcze żadnych aktywnych członków.
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
            {members!.map((member: any) => {
              const badge = roleBadge(member.role)
              const name = member.profiles?.display_name ?? '(usunięty profil)'
              const teamName = teamByOwner.get(member.user_id)
              const isMe = member.user_id === user?.id
              const showControls = canManageRoles && !isMe
              return (
                <div key={member.id} className="flex justify-between items-center px-5 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {name}
                      {isMe && <span className="text-xs text-gray-500"> (Ty)</span>}
                    </p>
                    {teamName
                      ? <p className="text-sm text-gray-400">Zespół: {teamName}</p>
                      : <p className="text-sm text-gray-500 italic">Brak drużyny</p>
                    }
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs rounded px-2 py-1 ${badge.cls}`}>{badge.label}</span>
                    {showControls && (
                      <MemberRoleControls
                        leagueId={id}
                        memberId={member.id}
                        currentRole={member.role}
                        viewerIsSuperAdmin={isSuperAdmin}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {currentSeason?.status === 'locked' && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Uczestnicy sezonu</h2>
          {seasonParticipants.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-6 text-gray-400 text-sm">
              Brak drużyn zapisanych do sezonu.
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
              {seasonParticipants.map((p: any) => {
                const roster = rosterByParticipant.get(p.id) ?? []
                return (
                  <div key={p.id} className="px-5 py-4">
                    <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                      <div>
                        <p className="font-medium">{p.teams?.name ?? '(brak nazwy)'}</p>
                        <p className="text-xs text-gray-400">
                          {p.teams?.profiles?.display_name ?? '(brak właściciela)'}
                        </p>
                      </div>
                      <span className={`text-xs rounded px-2 py-1 ${roster.length >= 9 ? 'bg-green-700' : 'bg-gray-700'}`}>
                        {roster.length}/9 zawodników
                      </span>
                    </div>
                    {roster.length === 0 ? (
                      <p className="text-xs text-gray-500 italic mb-2">Brak zawodników w składzie</p>
                    ) : (
                      <div className="text-xs text-gray-300 mb-2 space-y-0.5">
                        {roster.filter((pl: any) => pl.position === 'napastnik').length > 0 && (
                          <p>
                            <span className="font-bold text-gray-200">Napastnicy:</span>{' '}
                            {roster.filter((pl: any) => pl.position === 'napastnik').map((pl: any) => `${pl.full_name} (${pl.club})`).join(', ')}
                          </p>
                        )}
                        {roster.filter((pl: any) => pl.position === 'pomocnik').length > 0 && (
                          <p>
                            <span className="font-bold text-gray-200">Pomocnicy:</span>{' '}
                            {roster.filter((pl: any) => pl.position === 'pomocnik').map((pl: any) => `${pl.full_name} (${pl.club})`).join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                    {canModerate && (
                      <RosterManagement
                        leagueId={id}
                        seasonParticipantId={p.id}
                        players={roster}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </>
  )
}
