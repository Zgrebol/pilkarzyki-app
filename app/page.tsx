import Link from 'next/link'
import { createClient } from '../utils/supabase/server'
import { Badge } from '@/app/components/ui/Badge'
import { Card } from '@/app/components/ui/Card'
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserIcon,
} from '@heroicons/react/24/outline'

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return <Badge variant="admin"><ShieldCheckIcon className="h-3 w-3" /> admin</Badge>
  }
  if (role === 'mod') {
    return <Badge variant="mod"><ShieldExclamationIcon className="h-3 w-3" /> mod</Badge>
  }
  return <Badge variant="player"><UserIcon className="h-3 w-3" /> gracz</Badge>
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let myLeagues: { id: string; name: string; description: string | null; season_name: string | null; role: string }[] = []

  if (user) {
    const { data } = await supabase
      .from('league_members')
      .select('role, leagues(id, name, description, season_name, status)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('leagues.status', 'active')

    myLeagues = (data ?? []).flatMap((m: any) =>
      m.leagues ? [{ ...m.leagues, role: m.role }] : []
    )
  }

  const { data: publicLeagues } = await supabase
    .from('leagues')
    .select('id, name, description, season_name, max_teams')
    .eq('is_public', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const myLeagueIds = new Set(myLeagues.map(l => l.id))
  const otherPublicLeagues = (publicLeagues ?? []).filter(l => !myLeagueIds.has(l.id))

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-2">Piłkarzyki</h1>
          <p className="text-lg text-gray-400">Platforma fantasy ligi piłkarskiej</p>
        </div>

        <div className="flex justify-center mb-12">
          {user ? (
            <div className="flex gap-3 items-center justify-center">
              <Link
                href="/leagues/new"
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm rounded px-4 py-2"
              >
                + Stwórz ligę
              </Link>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                href="/login"
                className="bg-blue-700 hover:bg-blue-600 text-white rounded px-5 py-2 text-sm"
              >
                Zaloguj się
              </Link>
              <Link
                href="/signup"
                className="bg-gray-700 hover:bg-gray-600 text-white rounded px-5 py-2 text-sm"
              >
                Zarejestruj się
              </Link>
            </div>
          )}
        </div>

        {user && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Twoje ligi</h2>
            {myLeagues.length === 0 ? (
              <Card className="p-6 text-gray-400 text-sm">
                Nie należysz jeszcze do żadnej ligi.{' '}
                <Link href="/leagues/new" className="text-green-400 hover:underline">
                  Stwórz swoją pierwszą
                </Link>
                {' '}lub dołącz do publicznej poniżej.
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {myLeagues.map(league => (
                  <Link
                    key={league.id}
                    href={`/leagues/${league.id}`}
                    className="block"
                  >
                    <Card className="p-5 hover:bg-gray-700 transition">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{league.name}</h3>
                        <RoleBadge role={league.role} />
                      </div>
                      {league.description && (
                        <p className="text-sm text-gray-400 mb-2 line-clamp-2">{league.description}</p>
                      )}
                      {league.season_name && (
                        <p className="text-xs text-gray-500">Sezon {league.season_name}</p>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {user ? 'Inne ligi publiczne' : 'Ligi publiczne'}
          </h2>
          {otherPublicLeagues.length === 0 ? (
            <Card className="p-6 text-gray-400 text-sm">
              {user
                ? 'Brak innych publicznych lig poza Twoimi.'
                : 'Nie ma jeszcze żadnych publicznych lig na platformie.'}
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {otherPublicLeagues.map(league => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="block"
                >
                  <Card className="p-5 hover:bg-gray-700 transition">
                    <h3 className="font-semibold mb-2">{league.name}</h3>
                    {league.description && (
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{league.description}</p>
                    )}
                    <div className="flex gap-3 text-xs text-gray-500">
                      {league.season_name && <span>Sezon {league.season_name}</span>}
                      <span>Limit: {league.max_teams}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
