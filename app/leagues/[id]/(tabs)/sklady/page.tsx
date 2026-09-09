import { createClient } from '../../../../../utils/supabase/server'
import { Card } from '@/app/components/ui/Card'
import { Badge } from '@/app/components/ui/Badge'
import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function SkladyPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/leagues/${id}/sklady`)
  }

  const { data: myMembership } = await supabase
    .from('league_members')
    .select('role, status')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  let isSuperAdmin = false
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()
  isSuperAdmin = profile?.is_super_admin ?? false

  const isMember = isSuperAdmin || myMembership?.status === 'active'

  if (!isMember) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Składy drużyn</h2>
        <p className="text-gray-400 text-sm">Widok dostępny tylko dla członków ligi.</p>
      </Card>
    )
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
        <h2 className="text-xl font-semibold mb-3">Składy drużyn</h2>
        <p className="text-gray-400 text-sm">Składy będą dostępne po rozpoczęciu sezonu.</p>
      </Card>
    )
  }

  const { data: participantsData } = await supabase
    .from('season_participants')
    .select('id, teams(name, owner_id, profiles(display_name))')
    .eq('season_id', currentSeason.id)

  const participants = participantsData ?? []

  if (participants.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Składy drużyn</h2>
        <p className="text-gray-400 text-sm">Brak drużyn zapisanych do sezonu.</p>
      </Card>
    )
  }

  const participantIds = participants.map((p: any) => p.id)
  const { data: allPlayers } = await supabase
    .from('roster_players')
    .select('id, season_participant_id, full_name, club, position, league')
    .in('season_participant_id', participantIds)
    .order('position')
    .order('full_name')

  const rosterByParticipant = new Map<string, any[]>()
  for (const player of (allPlayers ?? []) as any[]) {
    const list = rosterByParticipant.get(player.season_participant_id) ?? []
    list.push(player)
    rosterByParticipant.set(player.season_participant_id, list)
  }

  const POSITIONS = ['napastnik', 'pomocnik', 'obrońca', 'bramkarz']

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Składy drużyn</h2>
      <div className="space-y-4">
        {(participants as any[]).map((p: any) => {
          const roster = rosterByParticipant.get(p.id) ?? []
          return (
            <Card key={p.id} className="p-5">
              <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                <div>
                  <p className="font-semibold text-lg">{p.teams?.name ?? '(brak nazwy)'}</p>
                  <p className="text-sm text-gray-400">{p.teams?.profiles?.display_name ?? '(brak właściciela)'}</p>
                </div>
                <Badge variant={roster.length >= 9 ? 'pairs-ok' : 'neutral'}>
                  {roster.length}/9
                </Badge>
              </div>
              {roster.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Brak zawodników w składzie</p>
              ) : (
                <div className="space-y-2">
                  {POSITIONS.map(pos => {
                    const group = roster.filter((pl: any) => pl.position === pos)
                    if (group.length === 0) return null
                    return (
                      <div key={pos}>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 capitalize">{pos}cy</p>
                        <div className="space-y-1">
                          {group.map((pl: any) => (
                            <div key={pl.id} className="flex items-center gap-3 text-sm">
                              <span className="font-medium text-white">{pl.full_name}</span>
                              <span className="text-gray-400">{pl.club}</span>
                              {pl.league && <span className="text-gray-500 text-xs">{pl.league}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </section>
  )
}
