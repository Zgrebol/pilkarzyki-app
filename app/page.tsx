import Link from 'next/link'
import { createClient } from '../utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Ligi usera (tylko jeśli zalogowany)
  let myLeagues: { id: string; name: string; description: string | null; season_name: string | null; role: string }[] = []

  if (user) {
    const { data } = await supabase
      .from('league_members')
      .select('role, leagues(id, name, description, season_name)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    myLeagues = (data ?? []).flatMap((m: any) =>
      m.leagues ? [{ ...m.leagues, role: m.role }] : []
    )
  }

  // Ligi publiczne (dla wszystkich)
  const { data: publicLeagues } = await supabase
    .from('leagues')
    .select('id, name, description, season_name, max_teams')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  const myLeagueIds = new Set(myLeagues.map(l => l.id))
  const otherPublicLeagues = (publicLeagues ?? []).filter(l => !myLeagueIds.has(l.id))

  async function handleSignOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-2">Piłkarzyki</h1>
          <p className="text-lg text-gray-400">Platforma fantasy ligi piłkarskiej</p>
        </div>

        {/* Pasek logowania / profilu */}
        <div className="flex justify-center mb-12">
          {user ? (
            <div className="flex gap-3 items-center flex-wrap justify-center">
              <span className="text-sm text-gray-400">Zalogowany jako {user.email}</span>
              <Link
                href="/profile"
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm rounded px-4 py-2"
              >
                Profil
              </Link>
              <Link
                href="/leagues/new"
                className="bg-green-600 hover:bg-green-700 text-white text-sm rounded px-4 py-2"
              >
                + Stwórz ligę
              </Link>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white text-sm rounded px-4 py-2"
                >
                  Wyloguj
                </button>
              </form>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded px-5 py-2"
              >
                Zaloguj się
              </Link>
              <Link
                href="/signup"
                className="bg-gray-700 hover:bg-gray-600 text-white rounded px-5 py-2"
              >
                Zarejestruj się
              </Link>
            </div>
          )}
        </div>

        {/* Sekcja: Twoje ligi */}
        {user && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Twoje ligi</h2>
            {myLeagues.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-6 text-gray-400 text-sm">
                Nie należysz jeszcze do żadnej ligi.{' '}
                <Link href="/leagues/new" className="text-green-400 hover:underline">
                  Stwórz swoją pierwszą
                </Link>
                {' '}lub dołącz do publicznej poniżej.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {myLeagues.map(league => (
                  <Link
                    key={league.id}
                    href={`/leagues/${league.id}`}
                    className="bg-gray-800 hover:bg-gray-700 rounded-lg p-5 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{league.name}</h3>
                      <span className="text-xs bg-gray-700 rounded px-2 py-0.5">
                        {league.role === 'admin' ? '👑 admin' :
                         league.role === 'mod' ? '🛡️ mod' :
                         '⚽ gracz'}
                      </span>
                    </div>
                    {league.description && (
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{league.description}</p>
                    )}
                    {league.season_name && (
                      <p className="text-xs text-gray-500">Sezon {league.season_name}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Sekcja: Ligi publiczne */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {user ? 'Inne ligi publiczne' : 'Ligi publiczne'}
          </h2>
          {otherPublicLeagues.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-6 text-gray-400 text-sm">
              {user
                ? 'Brak innych publicznych lig poza Twoimi.'
                : 'Nie ma jeszcze żadnych publicznych lig na platformie.'}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {otherPublicLeagues.map(league => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="bg-gray-800 hover:bg-gray-700 rounded-lg p-5 transition"
                >
                  <h3 className="font-semibold mb-2">{league.name}</h3>
                  {league.description && (
                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">{league.description}</p>
                  )}
                  <div className="flex gap-3 text-xs text-gray-500">
                    {league.season_name && <span>Sezon {league.season_name}</span>}
                    <span>Limit: {league.max_teams}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}