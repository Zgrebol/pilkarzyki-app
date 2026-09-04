import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../../utils/supabase/server'
import TabsNav from './tabs-nav'
import DeleteLeagueButton from '../delete-league-button'
import RestoreLeagueButton from '../restore-league-button'
import CloseRegistrationButton from '../close-registration-button'
import ReopenRegistrationButton from '../reopen-registration-button'
import LeaveLeagueButton from '../leave-league-button'
import CreateTeamButton from '../create-team-button'
import FillIronLineupsButton from '../fill-iron-lineups-button'
import PendingMembersPanel from '../pending-members-panel'

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

function roleBadge(role: string) {
  if (role === 'admin') return { label: '👑 admin', cls: 'bg-yellow-600' }
  if (role === 'mod') return { label: '🛡️ mod', cls: 'bg-blue-600' }
  return { label: '⚽ gracz', cls: 'bg-gray-700' }
}

export default async function LeagueLayout({ params, children }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, description, season_name, max_teams, is_public, created_at, status')
    .eq('id', id)
    .maybeSingle()

  if (leagueError || !league) {
    notFound()
  }

  let isSuperAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()
    isSuperAdmin = profile?.is_super_admin ?? false
  }

  const isDeleted = league.status === 'deleted'
  if (isDeleted && !isSuperAdmin) {
    notFound()
  }

  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('id, status')
    .eq('league_id', id)
    .in('status', ['registration', 'locked'])
    .maybeSingle()

  let myMembership: { role: string; status: string } | null = null
  if (user) {
    const { data } = await supabase
      .from('league_members')
      .select('role, status')
      .eq('league_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    myMembership = data
  }

  const { count: memberCount } = await supabase
    .from('league_members')
    .select('id', { count: 'exact', head: true })
    .eq('league_id', id)
    .eq('status', 'active')

  const { data: teamsData } = await supabase
    .from('teams')
    .select('owner_id')
    .eq('league_id', id)

  const ownerIds = new Set((teamsData ?? []).map((t: any) => t.owner_id))

  const canModerate = isSuperAdmin ||
    (myMembership?.status === 'active' &&
      (myMembership.role === 'admin' || myMembership.role === 'mod'))

  const iAmLeagueAdmin = myMembership?.status === 'active' && myMembership.role === 'admin'

  const spotsLeft = league.max_teams - (memberCount ?? 0)
  const isFull = spotsLeft <= 0
  const createdDate = new Date(league.created_at).toLocaleDateString('pl-PL')

  let pendingMembers: Array<{
    id: string
    team_name: string | null
    joined_at: string
    display_name: string
  }> = []

  if (canModerate) {
    const { data: pendingRaw } = await supabase
      .from('league_members')
      .select('id, team_name, joined_at, profiles(display_name)')
      .eq('league_id', id)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true })

    pendingMembers = (pendingRaw ?? []).map((m: any) => ({
      id: m.id,
      team_name: m.team_name,
      joined_at: m.joined_at,
      display_name: m.profiles?.display_name ?? '(usunięty profil)',
    }))
  }

  let actionPanel: 'guest_join' | 'logged_join' | 'pending' | 'left' | null = null
  if (myMembership?.status === 'left') {
    actionPanel = 'left'
  } else if (league.is_public && !myMembership) {
    actionPanel = !user ? 'guest_join' : 'logged_join'
  } else if (myMembership?.status === 'pending') {
    actionPanel = 'pending'
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {isDeleted && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-red-200">
              🗑️ Ta liga jest usunięta. Widzisz ją jako super admin.
            </span>
            <RestoreLeagueButton leagueId={id} />
          </div>
        )}

        <Link href="/" className="text-sm text-gray-400 hover:text-white mb-4 inline-block">
          ← Wróć na stronę główną
        </Link>

        {/* Nagłówek ligi */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
            <h1 className="text-3xl font-bold">{league.name}</h1>
            <div className="flex items-center gap-2">
              {(isSuperAdmin || (myMembership?.role === 'admin' && myMembership?.status === 'active')) && (
                <Link
                  href={`/leagues/${id}/edit`}
                  className="text-xs bg-blue-600 hover:bg-blue-700 rounded px-3 py-1"
                >
                  ✏️ Edytuj
                </Link>
              )}
              {isSuperAdmin && !isDeleted && (
                <DeleteLeagueButton leagueId={id} leagueName={league.name} />
              )}
              <span className={`text-xs rounded px-2 py-1 ${league.is_public ? 'bg-green-700' : 'bg-gray-700'}`}>
                {league.is_public ? '🌍 publiczna' : '🔒 prywatna'}
              </span>
            </div>
          </div>

          {league.description && (
            <p className="text-gray-300 mb-4">{league.description}</p>
          )}

          <div className="flex gap-4 text-sm text-gray-400 flex-wrap">
            {league.season_name && (
              <span className="flex items-center gap-2 flex-wrap">
                <span>Sezon: <span className="text-white">{league.season_name}</span></span>
                {currentSeason?.status === 'locked' && (
                  <>
                    <span className="text-xs text-gray-500">🔒 Zapisy zamknięte</span>
                    {(isSuperAdmin || iAmLeagueAdmin) && (
                      <ReopenRegistrationButton leagueId={id} />
                    )}
                  </>
                )}
                {currentSeason?.status === 'registration' && (isSuperAdmin || iAmLeagueAdmin) && (
                  <CloseRegistrationButton leagueId={id} />
                )}
              </span>
            )}
            <span>Zespoły: <span className="text-white">{memberCount ?? 0} / {league.max_teams}</span></span>
            <span>Utworzono: <span className="text-white">{createdDate}</span></span>
          </div>

          {myMembership?.status === 'active' ? (
            <div className="mt-4 pt-4 border-t border-gray-700 text-sm">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <span className="text-gray-400">Twoja rola w lidze: </span>
                  <span className={`text-xs rounded px-2 py-1 ${roleBadge(myMembership.role).cls}`}>
                    {roleBadge(myMembership.role).label}
                  </span>
                </div>
                <LeaveLeagueButton leagueId={id} mode="active" />
              </div>
              {user && !ownerIds.has(user.id) && (
                <div className="mt-3">
                  <CreateTeamButton leagueId={id} />
                </div>
              )}
            </div>
          ) : isSuperAdmin && !myMembership ? (
            <div className="mt-4 pt-4 border-t border-yellow-700/50 text-sm bg-yellow-900/20 -mx-6 -mb-6 px-6 py-3 rounded-b-lg">
              🛡️ <span className="text-yellow-400">Wchodzisz jako super admin platformy.</span>
              <span className="text-gray-400"> Nie jesteś członkiem tej ligi.</span>
            </div>
          ) : null}
        </div>

        {/* Panel dołączenia / statusu */}
        {actionPanel && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            {actionPanel === 'guest_join' && (
              isFull ? (
                <div className="text-center">
                  <p className="text-gray-400 mb-2">🔒 Brak wolnych miejsc</p>
                  <p className="text-xs text-gray-500">Limit zespołów ({league.max_teams}) został osiągnięty.</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-3">
                    Chcesz dołączyć do tej ligi? Wolnych miejsc: <span className="text-white">{spotsLeft}</span>
                  </p>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/leagues/${id}`)}`}
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white rounded px-5 py-2"
                  >
                    Zaloguj się, żeby dołączyć
                  </Link>
                  <p className="text-xs text-gray-500 mt-3">
                    Nie masz konta?{' '}
                    <Link href={`/signup?next=${encodeURIComponent(`/leagues/${id}`)}`} className="text-blue-400 hover:underline">
                      Zarejestruj się
                    </Link>
                  </p>
                </div>
              )
            )}

            {actionPanel === 'logged_join' && (
              isFull ? (
                <div className="text-center">
                  <p className="text-gray-400 mb-2">🔒 Brak wolnych miejsc</p>
                  <p className="text-xs text-gray-500">Limit zespołów ({league.max_teams}) został osiągnięty.</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-3">
                    Wolnych miejsc: <span className="text-white">{spotsLeft}</span>
                  </p>
                  <Link href={`/leagues/${id}/join`} className="inline-block bg-green-600 hover:bg-green-700 text-white rounded px-5 py-2">
                    Dołącz do ligi
                  </Link>
                </div>
              )
            )}

            {actionPanel === 'pending' && (
              <div className="text-center">
                <p className="text-yellow-400 mb-1">⏳ Czekasz na akceptację</p>
                <p className="text-sm text-gray-400 mb-4">Twoje zgłoszenie do tej ligi jest oczekujące. Moderator wkrótce się tym zajmie.</p>
                <div className="flex justify-center">
                  <LeaveLeagueButton leagueId={id} mode="pending" />
                </div>
              </div>
            )}

            {actionPanel === 'left' && (
              <div className="text-center">
                <p className="text-gray-400 mb-1">👋 Opuściłeś tę ligę</p>
                <p className="text-sm text-gray-500">Żeby wrócić, admin ligi musi cię zaprosić ponownie.</p>
              </div>
            )}
          </div>
        )}

        {/* Oczekujące zgłoszenia — dla moderatorów */}
        {canModerate && (
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              ⏳ Oczekujące zgłoszenia
              {pendingMembers.length > 0 && (
                <span className="bg-yellow-600 text-xs rounded px-2 py-0.5">{pendingMembers.length}</span>
              )}
            </h2>
            <PendingMembersPanel leagueId={id} pendingMembers={pendingMembers} />
          </section>
        )}

        {/* Przycisk uzupełnienia żelaznych trójek */}
        {canModerate && currentSeason?.status === 'locked' && (
          <div className="flex justify-end mb-4">
            <FillIronLineupsButton seasonId={currentSeason.id} />
          </div>
        )}

        <TabsNav leagueId={id} />

        {children}

      </div>
    </div>
  )
}
