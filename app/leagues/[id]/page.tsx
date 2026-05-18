import { notFound } from 'next/navigation'
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

  // Pobierz członków ligi razem z profilami (display_name)
  const { data: members } = await supabase
    .from('league_members')
    .select('role, status, team_name, joined_at, profiles(display_name)')
    .eq('league_id', id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  // Czy obecny user jest członkiem tej ligi?
  const myMembership = members?.find((m: any) => {
    // members nie zawiera user_id — sprawdzamy osobno
    return false
  })

  // Powyższe nie zadziała bo nie pobraliśmy user_id. Robimy drugie zapytanie:
  let myRole: string | null = null
  if (user) {
    const { data: me } = await supabase
      .from('league_members')
      .select('role')
      .eq('league_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    myRole = me?.role ?? null
  }

// Czy zalogowany user to super admin? (do banerki "wchodzisz jako platforma")
  let isSuperAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()
    isSuperAdmin = profile?.is_super_admin ?? false
  }


  const createdDate = new Date(league.created_at).toLocaleDateString('pl-PL')
  const memberCount = members?.length ?? 0

  function roleBadge(role: string) {
    if (role === 'admin') return { label: '👑 admin', cls: 'bg-yellow-600' }
    if (role === 'mod') return { label: '🛡️ mod', cls: 'bg-blue-600' }
    return { label: '⚽ gracz', cls: 'bg-gray-700' }
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
            <span className={`text-xs rounded px-2 py-1 ${league.is_public ? 'bg-green-700' : 'bg-gray-700'}`}>
              {league.is_public ? '🌍 publiczna' : '🔒 prywatna'}
            </span>
          </div>

          {league.description && (
            <p className="text-gray-300 mb-4">{league.description}</p>
          )}

          <div className="flex gap-4 text-sm text-gray-400 flex-wrap">
            {league.season_name && <span>Sezon: <span className="text-white">{league.season_name}</span></span>}
            <span>Zespoły: <span className="text-white">{memberCount} / {league.max_teams}</span></span>
            <span>Utworzono: <span className="text-white">{createdDate}</span></span>
          </div>

          {myRole ? (
            <div className="mt-4 pt-4 border-t border-gray-700 text-sm">
              <span className="text-gray-400">Twoja rola w lidze: </span>
              <span className={`text-xs rounded px-2 py-1 ${roleBadge(myRole).cls}`}>
                {roleBadge(myRole).label}
              </span>
            </div>
          ) : isSuperAdmin ? (
            <div className="mt-4 pt-4 border-t border-yellow-700/50 text-sm bg-yellow-900/20 -mx-6 -mb-6 px-6 py-3 rounded-b-lg">
              🛡️ <span className="text-yellow-400">Wchodzisz jako super admin platformy.</span>
              <span className="text-gray-400"> Nie jesteś członkiem tej ligi.</span>
            </div>
          ) : null}
        </div>

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
                return (
                  <div key={idx} className="flex justify-between items-center px-5 py-3">
                    <div>
                      <p className="font-medium">{name}</p>
                      {member.team_name && (
                        <p className="text-sm text-gray-400">Zespół: {member.team_name}</p>
                      )}
                    </div>
                    <span className={`text-xs rounded px-2 py-1 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}