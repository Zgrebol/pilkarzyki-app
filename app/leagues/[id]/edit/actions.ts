'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../../../utils/supabase/server'

export async function updateLeague(leagueId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const isPublic = formData.get('is_public') === 'on'
  const maxTeams = Number(formData.get('max_teams') ?? 16)
  const seasonName = String(formData.get('season_name') ?? '').trim()

  // Walidacja — spójna z createLeague
  if (name.length < 3 || name.length > 50) {
    return { error: 'Nazwa ligi musi mieć od 3 do 50 znaków' }
  }
  if (maxTeams < 2 || maxTeams > 100) {
    return { error: 'Limit zespołów: od 2 do 100' }
  }
  if (seasonName.length === 0) {
    return { error: 'Podaj nazwę sezonu (np. "2025/26")' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Brak sesji — zaloguj się ponownie' }
  }

  // Sprawdź ile aktywnych członków, żeby nie pozwolić ustawić max_teams < active_count
  const { count: activeCount, error: countError } = await supabase
    .from('league_members')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .eq('status', 'active')

  if (countError) {
    return { error: countError.message }
  }

  if (activeCount !== null && maxTeams < activeCount) {
    return { 
      error: `Nie możesz ustawić limitu na ${maxTeams}, w lidze jest już ${activeCount} aktywnych zespołów.`
    }
  }

  // UPDATE — RLS policy "leagues update admin" sprawdza uprawnienia
  // (admin ligi LUB super admin). Jeśli user nie ma uprawnień, RLS odsieje
  // wiersz i Postgrest zwróci 0 zmienionych wierszy bez ERROR.
  const { data: updated, error: updateError } = await supabase
    .from('leagues')
    .update({
      name,
      description: description || null,
      is_public: isPublic,
      max_teams: maxTeams,
      season_name: seasonName,
    })
    .eq('id', leagueId)
    .select('id')
    .maybeSingle()

  if (updateError) {
    return { error: updateError.message }
  }

  if (!updated) {
    return { error: 'Nie masz uprawnień do edycji tej ligi.' }
  }

  revalidatePath(`/leagues/${leagueId}`)
  revalidatePath('/')
  redirect(`/leagues/${leagueId}`)
}