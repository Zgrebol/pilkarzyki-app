import { createClient } from '../../../../../utils/supabase/server'
import RosterManagement from '../../roster-management'
import DraftPositionEditor from '../../draft-position-editor'
import { Card } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EdytujSkladPage({ params }: Props) {
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
        Edycja składów będzie dostępna po zamknięciu zapisów.
      </Card>
    )
  }

  const { data: participantsData } = await supabase
    .from('season_participants')
    .select('id, draft_position, teams(name, owner_id, profiles(display_name))')
    .eq('season_id', currentSeason.id)

  const seasonParticipants = participantsData ?? []

  if (seasonParticipants.length === 0) {
    return (
      <>
        <h2 className="text-xl font-semibold mb-4">Edytuj skład</h2>
        <Card className="p-6 text-gray-400 text-sm">
          Brak drużyn zapisanych do sezonu.
        </Card>
      </>
    )
  }

  const participantIds = seasonParticipants.map((p: any) => p.id)
  const { data: allPlayers } = await supabase
    .from('roster_players')
    .select('id, season_participant_id, full_name, club, position, league')
    .in('season_participant_id', participantIds)

  const rosterByParticipant = new Map<string, any[]>()
  for (const player of (allPlayers ?? []) as any[]) {
    const list = rosterByParticipant.get(player.season_participant_id) ?? []
    list.push(player)
    rosterByParticipant.set(player.season_participant_id, list)
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Edytuj skład</h2>
      <Card className="divide-y divide-gray-700">
        {(seasonParticipants as any[]).map((p: any) => {
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
                <Badge variant={roster.length >= 9 ? 'pairs-ok' : 'neutral'}>
                  {roster.length}/9 zawodników
                </Badge>
              </div>
              <DraftPositionEditor
                participantId={p.id}
                currentDraftPosition={p.draft_position ?? null}
              />
              <RosterManagement
                leagueId={id}
                seasonParticipantId={p.id}
                players={roster}
              />
            </div>
          )
        })}
      </Card>
    </section>
  )
}
