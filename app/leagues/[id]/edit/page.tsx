import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../../utils/supabase/server'
import EditLeagueForm from './edit-league-form'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditLeaguePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/leagues/${id}/edit`)}`)
  }

  // Pobierz ligę — RLS odsieje wiersz, jeśli user nie powinien jej widzieć
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, description, season_name, max_teams, is_public')
    .eq('id', id)
    .maybeSingle()

  if (!league) {
    notFound()
  }

  // Sprawdź czy user może edytować: admin ligi LUB super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()
  const isSuperAdmin = profile?.is_super_admin ?? false

  let isLeagueAdmin = false
  if (!isSuperAdmin) {
    const { data: membership } = await supabase
      .from('league_members')
      .select('role, status')
      .eq('league_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    isLeagueAdmin = membership?.role === 'admin' && membership?.status === 'active'
  }

  if (!isSuperAdmin && !isLeagueAdmin) {
    // User widzi ligę, ale nie może jej edytować — wracamy do widoku ligi
    redirect(`/leagues/${id}`)
  }

  // Policz aktywnych członków — do walidacji max_teams w UI
  const { count: activeCount } = await supabase
    .from('league_members')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', id)
    .eq('status', 'active')

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[500px]">
        <Link
          href={`/leagues/${id}`}
          className="text-sm text-gray-400 hover:text-white mb-4 inline-block"
        >
          ← Wróć do ligi
        </Link>

        <h1 className="text-2xl font-bold mb-6">Edytuj ligę</h1>

        <div className="bg-gray-800 rounded-lg p-6">
          <EditLeagueForm
            leagueId={id}
            initialValues={{
              name: league.name,
              description: league.description,
              season_name: league.season_name,
              max_teams: league.max_teams,
              is_public: league.is_public,
            }}
            activeCount={activeCount ?? 0}
          />
        </div>
      </div>
    </div>
  )
}