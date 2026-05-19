'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

export type LeaveLeagueResult = 
  | { ok: true }
  | { ok: false; error: string }

export async function leaveLeague(
  leagueId: string
): Promise<LeaveLeagueResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Musisz być zalogowany.' }
  }

  // Pobierz obecny stan członkostwa — z tego wynika, czy to wyjście z ligi
  // (active → soft delete) czy cofnięcie zgłoszenia (pending → hard delete).
  const { data: membership } = await supabase
    .from('league_members')
    .select('status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return { ok: false, error: 'Nie jesteś członkiem tej ligi.' }
  }

  if (membership.status === 'left') {
    return { ok: false, error: 'Już opuściłeś tę ligę.' }
  }

  if (membership.status === 'pending') {
    // Cancel pending = hard delete. User może się potem zgłosić ponownie.
    const { error } = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', user.id)

    if (error) {
      return { ok: false, error: error.message }
    }

    revalidatePath(`/leagues/${leagueId}`)
    revalidatePath('/')
    return { ok: true }
  }

  if (membership.status === 'active') {
    // Wyjście z ligi = soft delete (zachowuje team_name na przyszłość).
    // Explicit pola — NIE updateujemy role ani team_name.
    const { error } = await supabase
      .from('league_members')
      .update({ 
        status: 'left', 
        left_at: new Date().toISOString() 
      })
      .eq('league_id', leagueId)
      .eq('user_id', user.id)

    if (error) {
      // P0001 z triggera ostatniego admina
      if (error.message.includes('przynajmniej jednego aktywnego admina')) {
        return {
          ok: false,
          error: 'Jesteś jedynym aktywnym adminem tej ligi. Najpierw promuj innego członka na admina.'
        }
      }
      return { ok: false, error: error.message }
    }

    revalidatePath(`/leagues/${leagueId}`)
    revalidatePath('/')
    return { ok: true }
  }

  return { ok: false, error: 'Nieprawidłowy status członkostwa.' }
}