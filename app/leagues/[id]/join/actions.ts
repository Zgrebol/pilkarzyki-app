'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../../../utils/supabase/server'

export async function joinLeague(leagueId: string, formData: FormData) {
  const teamName = String(formData.get('team_name') ?? '').trim()

  // Walidacja długości nazwy zespołu
  if (teamName.length < 2 || teamName.length > 30) {
    return { error: 'Nazwa zespołu musi mieć od 2 do 30 znaków' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Musisz być zalogowany, żeby dołączyć do ligi' }
  }

  // Pobierz ligę — czy istnieje, czy publiczna
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, max_teams, is_public')
    .eq('id', leagueId)
    .maybeSingle()

  if (!league) {
    return { error: 'Ta liga nie istnieje lub nie masz do niej dostępu' }
  }
  if (!league.is_public) {
    return { error: 'Do prywatnej ligi można dołączyć tylko przez zaproszenie' }
  }

  // Sprawdź czy user już nie jest w tej lidze (active LUB pending)
  const { data: existing } = await supabase
    .from('league_members')
    .select('id, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'active') {
      return { error: 'Już jesteś członkiem tej ligi' }
    }
    if (existing.status === 'pending') {
      return { error: 'Twoje zgłoszenie już czeka na akceptację moderatora' }
    }
  }

  // Sprawdź czy liga nie jest pełna (active members)
  const { count: activeCount } = await supabase
    .from('league_members')
    .select('id', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .eq('status', 'active')

  if (activeCount !== null && activeCount >= league.max_teams) {
    return { error: `Liga jest pełna (${activeCount}/${league.max_teams})` }
  }

  // Sprawdź unikalność team_name w tej lidze (case-insensitive)
  const { data: nameClash } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', leagueId)
    .ilike('team_name', teamName) // ilike = case-insensitive LIKE
    .maybeSingle()

  if (nameClash) {
    return { error: `Nazwa zespołu "${teamName}" jest już zajęta w tej lidze` }
  }

  // Wszystko OK — wstaw membership ze statusem pending
  const { error: insertError } = await supabase
    .from('league_members')
    .insert({
      league_id: leagueId,
      user_id: user.id,
      role: 'player',
      status: 'pending',
      team_name: teamName,
    })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/leagues/${leagueId}`)
  revalidatePath('/')
  redirect(`/leagues/${leagueId}`)
}