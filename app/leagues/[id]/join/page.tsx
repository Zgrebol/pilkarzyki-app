import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../../utils/supabase/server'
import JoinForm from './join-form'

type Props = {
  params: Promise<{ id: string }>
}

export default async function JoinLeaguePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Niezalogowany — leci na login z parametrem next
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/leagues/${id}/join`)}`)
  }

  // Pobierz ligę
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, is_public, max_teams')
    .eq('id', id)
    .maybeSingle()

  if (!league) {
    notFound()
  }

  // Prywatne ligi: brak dostępu do tego flow
  if (!league.is_public) {
    redirect(`/leagues/${id}`)
  }

  // Czy user już jest w tej lidze (active LUB pending)?
  // Jeśli tak — wracamy na stronę ligi, formularz nie ma sensu.
  const { data: existing } = await supabase
    .from('league_members')
    .select('status')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect(`/leagues/${id}`)
  }

  // Sprawdź czy liga ma jeszcze miejsce
  const { count: activeCount } = await supabase
    .from('league_members')
    .select('id', { count: 'exact', head: true })
    .eq('league_id', id)
    .eq('status', 'active')

  const isFull = activeCount !== null && activeCount >= league.max_teams

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[500px]">
        <Link
          href={`/leagues/${id}`}
          className="text-sm text-gray-400 hover:text-white mb-4 inline-block"
        >
          ← Wróć na stronę ligi
        </Link>

        <h1 className="text-2xl font-bold mb-6">Dołącz do ligi</h1>

        <div className="bg-gray-800 rounded-lg p-6">
          {isFull ? (
            <div className="text-center">
              <p className="text-gray-400 mb-2">🔒 Liga jest pełna</p>
              <p className="text-xs text-gray-500 mb-4">
                Limit zespołów ({league.max_teams}) został osiągnięty.
                Spróbuj dołączyć do innej publicznej ligi.
              </p>
              <Link
                href="/"
                className="inline-block bg-gray-700 hover:bg-gray-600 text-white text-sm rounded px-4 py-2"
              >
                Wróć na stronę główną
              </Link>
            </div>
          ) : (
            <JoinForm leagueId={league.id} leagueName={league.name} />
          )}
        </div>
      </div>
    </div>
  )
}