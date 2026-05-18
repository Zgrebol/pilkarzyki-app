'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

// Helper: sprawdza czy zalogowany user może moderować tę ligę
async function checkModerationRights(leagueId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Brak sesji — zaloguj się ponownie', supabase: null, user: null }
  }

  // Czy admin/mod tej ligi?
  const { data: membership } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const isModerator = membership?.role === 'admin' || membership?.role === 'mod'

  // Czy super admin?
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  const isSuperAdmin = profile?.is_super_admin ?? false

  if (!isModerator && !isSuperAdmin) {
    return { error: 'Nie masz uprawnień do moderacji tej ligi', supabase: null, user: null }
  }

  return { error: null, supabase, user }
}

export async function approveMember(leagueId: string, memberId: string) {
  const { error: authError, supabase } = await checkModerationRights(leagueId)
  if (authError || !supabase) return { error: authError }

  // Pobierz target wiersz i ligę
  const { data: target } = await supabase
    .from('league_members')
    .select('id, status, team_name, league_id')
    .eq('id', memberId)
    .eq('league_id', leagueId)
    .maybeSingle()

  if (!target) {
    return { error: 'Zgłoszenie nie istnieje' }
  }
  if (target.status !== 'pending') {
    return { error: 'To zgłoszenie nie jest już w stanie oczekującym' }
  }

  // Sprawdź czy liga ma jeszcze miejsce (race condition guard)
  const { data: league } = await supabase
    .from('leagues')
    .select('max_teams')
    .eq('id', leagueId)
    .single()

  const { count: activeCount } = await supabase
    .from('league_members')
    .select('id', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .eq('status', 'active')

  if (league && activeCount !== null && activeCount >= league.max_teams) {
    return { error: `Liga jest pełna (${activeCount}/${league.max_teams}). Najpierw zwolnij miejsce.` }
  }

  // Race condition guard: nazwa zespołu nadal unikalna wśród aktywnych?
  const { data: nameClash } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .ilike('team_name', target.team_name ?? '')
    .maybeSingle()

  if (nameClash) {
    return { error: `Inny aktywny zespół ma już nazwę "${target.team_name}"` }
  }

  // Akceptacja: pending → active
  const { error: updateError } = await supabase
    .from('league_members')
    .update({ status: 'active' })
    .eq('id', memberId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/leagues/${leagueId}`)
  revalidatePath('/')
  return { success: true }
}

export async function rejectMember(leagueId: string, memberId: string) {
  const { error: authError, supabase } = await checkModerationRights(leagueId)
  if (authError || !supabase) return { error: authError }

  // Pobierz target wiersz
  const { data: target } = await supabase
    .from('league_members')
    .select('id, status')
    .eq('id', memberId)
    .eq('league_id', leagueId)
    .maybeSingle()

  if (!target) {
    return { error: 'Zgłoszenie nie istnieje' }
  }
  if (target.status !== 'pending') {
    return { error: 'To zgłoszenie nie jest już w stanie oczekującym' }
  }

  // Odrzucenie = usunięcie wiersza (user może spróbować ponownie)
  const { error: deleteError } = await supabase
    .from('league_members')
    .delete()
    .eq('id', memberId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}