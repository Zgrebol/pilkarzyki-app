import MemberRoleControls from './member-role-controls'
import LeaveLeagueButton from './leave-league-button'
import { notFound } from 'next/navigation'
import PendingMembersPanel from './pending-members-panel'
import Link from 'next/link'
import { createClient } from '../../../utils/supabase/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function LeaguePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Pobierz ligę
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, description, season_name, max_teams, is_public, created_at')
    .eq('id', id)
    .maybeSingle()

  // Jeśli ligi nie ma w bazie LUB RLS jej nie wpuścił (prywatna, user nie członek)
  if (leagueError || !league) {
    notFound()
  }

   // Pobierz członków ligi (active) razem z profilami (display_name)
  const { data: members } = await supabase
    .from('league_members')
    .select('id, user_id, role, status, team_name, joined_at, profiles(display_name)')
    .eq('league_id', id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  // Moja membership w tej lidze (active LUB pending — żeby wiedzieć, czy czekam)
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

  // Czy zalogowany user to super admin?
  let isSuperAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()
    isSuperAdmin = profile?.is_super_admin ?? false
  }

  // Pobierz pending zgłoszenia — tylko jeśli zalogowany user może je moderować.
  // Sprawdzamy uprawnienia ZANIM zrobimy zapytanie do bazy, żeby zwykli userzy
  // nie widzieli pendingów innych przez DevTools / cache.
  const canModerate = isSuperAdmin ||
    myMembership?.status === 'active' &&
    (myMembership.role === 'admin' || myMembership.role === 'mod')
// Kto może zmieniać role (do UI). Bramka i tak jest w akcji — to tylko widoczność.
  const iAmLeagueAdmin = myMembership?.status === 'active' && myMembership.role === 'admin'
  const canManageRoles = iAmLeagueAdmin || isSuperAdmin

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

  const createdDate = new Date(league.created_at).toLocaleDateString('pl-PL')
  const memberCount = members?.length ?? 0
  const spotsLeft = league.max_teams - memberCount
  const isFull = spotsLeft <= 0

  function roleBadge(role: string) {
    if (role === 'admin') return { label: '👑 admin', cls: 'bg-yellow-600' }
    if (role === 'mod') return { label: '🛡️ mod', cls: 'bg-blue-600' }
    return { label: '⚽ gracz', cls: 'bg-gray-700' }
  }

// Decyzja: jaki call-to-action pokazać?
  let actionPanel: 'guest_join' | 'logged_join' | 'pending' | 'left' | null = null

  if (myMembership?.status === 'left') {
    // Left user widzi info "Opuściłeś tę ligę" niezależnie od typu ligi
    actionPanel = 'left'
  } else if (league.is_public && !myMembership) {
    if (!user) {
      actionPanel = 'guest_join'
    } else {
      actionPanel = 'logged_join'
    }
  } else if (myMembership?.status === 'pending') {
    actionPanel = 'pending'
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-white mb-4 inline-block"
        >
          ← Wróć na stronę główną
        </Link>

        {/* Header ligi */}
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
              <span className={`text-xs rounded px-2 py-1 ${league.is_public ? 'bg-green-700' : 'bg-gray-700'}`}>
                {league.is_public ? '🌍 publiczna' : '🔒 prywatna'}
              </span>
            </div>
          </div>

          {league.description && (
            <p className="text-gray-300 mb-4">{league.description}</p>
          )}

          <div className="flex gap-4 text-sm text-gray-400 flex-wrap">
            {league.season_name && <span>Sezon: <span className="text-white">{league.season_name}</span></span>}
            <span>Zespoły: <span className="text-white">{memberCount} / {league.max_teams}</span></span>
            <span>Utworzono: <span className="text-white">{createdDate}</span></span>
          </div>

        {myMembership?.status === 'active' ? (
            <div className="mt-4 pt-4 border-t border-gray-700 text-sm flex justify-between items-center flex-wrap gap-3">
              <div>
                <span className="text-gray-400">Twoja rola w lidze: </span>
                <span className={`text-xs rounded px-2 py-1 ${roleBadge(myMembership.role).cls}`}>
                  {roleBadge(myMembership.role).label}
                </span>
              </div>
              <LeaveLeagueButton leagueId={id} mode="active" />
            </div>
          ) : isSuperAdmin && !myMembership ? (
            <div className="mt-4 pt-4 border-t border-yellow-700/50 text-sm bg-yellow-900/20 -mx-6 -mb-6 px-6 py-3 rounded-b-lg">
              🛡️ <span className="text-yellow-400">Wchodzisz jako super admin platformy.</span>
              <span className="text-gray-400"> Nie jesteś członkiem tej ligi.</span>
            </div>
          ) : null}
        </div>

        {/* Panel akcji: dołącz / zaloguj / pending */}
        {actionPanel && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            {actionPanel === 'guest_join' && (
              isFull ? (
                <div className="text-center">
                  <p className="text-gray-400 mb-2">🔒 Brak wolnych miejsc</p>
                  <p className="text-xs text-gray-500">
                    Limit zespołów ({league.max_teams}) został osiągnięty.
                  </p>
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
                    <Link
                      href={`/signup?next=${encodeURIComponent(`/leagues/${id}`)}`}
                      className="text-blue-400 hover:underline"
                    >
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
                  <p className="text-xs text-gray-500">
                    Limit zespołów ({league.max_teams}) został osiągnięty.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-3">
                    Wolnych miejsc: <span className="text-white">{spotsLeft}</span>
                  </p>
                  <Link
                    href={`/leagues/${id}/join`}
                    className="inline-block bg-green-600 hover:bg-green-700 text-white rounded px-5 py-2"
                  >
                    Dołącz do ligi
                  </Link>
                </div>
              )
            )}

       {actionPanel === 'pending' && (
              <div className="text-center">
                <p className="text-yellow-400 mb-1">⏳ Czekasz na akceptację</p>
                <p className="text-sm text-gray-400 mb-4">
                  Twoje zgłoszenie do tej ligi jest oczekujące. Moderator wkrótce się tym zajmie.
                </p>
                <div className="flex justify-center">
                  <LeaveLeagueButton leagueId={id} mode="pending" />
                </div>
              </div>
            )}

            {actionPanel === 'left' && (
              <div className="text-center">
                <p className="text-gray-400 mb-1">👋 Opuściłeś tę ligę</p>
                <p className="text-sm text-gray-500">
                  Żeby wrócić, admin ligi musi cię zaprosić ponownie.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Lista członków */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Członkowie ({memberCount})
          </h2>
          {memberCount === 0 ? (
            <div className="bg-gray-800 rounded-lg p-6 text-gray-400 text-sm">
              W lidze nie ma jeszcze żadnych aktywnych członków.
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
              {members!.map((member: any, idx: number) => {
                const badge = roleBadge(member.role)
                const name = member.profiles?.display_name ?? '(usunięty profil)'
                const isMe = member.user_id === user?.id
                const showControls = canManageRoles && !isMe
                return (
                  <div key={idx} className="flex justify-between items-center px-5 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{name}{isMe && <span className="text-xs text-gray-500"> (Ty)</span>}</p>
                      {member.team_name && (
                        <p className="text-sm text-gray-400">Zespół: {member.team_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs rounded px-2 py-1 ${badge.cls}`}>
                        {badge.label}
                      </span>
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
        {/* Panel moderatora — pending zgłoszenia */}
        {canModerate && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              ⏳ Oczekujące zgłoszenia
              {pendingMembers.length > 0 && (
                <span className="bg-yellow-600 text-xs rounded px-2 py-0.5">
                  {pendingMembers.length}
                </span>
              )}
            </h2>
            <PendingMembersPanel
              leagueId={id}
              pendingMembers={pendingMembers}
            />
          </section>
        )}

      </div>
    </div>
  )
}