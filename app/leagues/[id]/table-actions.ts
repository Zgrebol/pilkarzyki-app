'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Brak sesji — zaloguj się ponownie', supabase: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_super_admin) return { error: 'Tylko super admin może nadpisywać pozycje', supabase: null }
  return { error: null, supabase }
}

async function requireLeagueModOrAdminOrSuper(leagueId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Brak sesji — zaloguj się ponownie', supabase: null }

  const { data: membership } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const isModOrAdmin = membership?.role === 'admin' || membership?.role === 'mod'

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!isModOrAdmin && !profile?.is_super_admin) {
    return { error: 'Brak uprawnień do zmiany pozycji draftu', supabase: null }
  }
  return { error: null, supabase }
}

async function getParticipantLeague(supabase: Awaited<ReturnType<typeof createClient>>, participantId: string) {
  const { data } = await supabase
    .from('season_participants')
    .select('id, seasons(league_id)')
    .eq('id', participantId)
    .maybeSingle()
  return (data as any)?.seasons?.league_id as string | undefined
}

export async function setManualPosition(
  participantId: string,
  position: number | null
): Promise<{ success: true } | { error: string }> {
  const { error: authError, supabase } = await requireSuperAdmin()
  if (authError || !supabase) return { error: authError ?? 'Błąd autoryzacji' }

  const leagueId = await getParticipantLeague(supabase, participantId)
  if (!leagueId) return { error: 'Nie można ustalić ligi dla tego uczestnika' }

  const { data: updated, error: updateError } = await supabase
    .from('season_participants')
    .update({ manual_position_override: position })
    .eq('id', participantId)
    .select('id')

  if (updateError) return { error: updateError.message }
  if (!updated || updated.length === 0) return { error: 'Zapis zablokowany — sprawdź polityki RLS dla season_participants' }

  revalidatePath(`/leagues/${leagueId}`, 'layout')
  return { success: true }
}

export async function setDraftPosition(
  participantId: string,
  position: number | null
): Promise<{ success: true } | { error: string }> {
  const supabaseInit = await createClient()
  const leagueId = await getParticipantLeague(supabaseInit, participantId)
  if (!leagueId) return { error: 'Nie można ustalić ligi dla tego uczestnika' }

  const { error: authError, supabase } = await requireLeagueModOrAdminOrSuper(leagueId)
  if (authError || !supabase) return { error: authError ?? 'Błąd autoryzacji' }

  const { error: updateError } = await supabase
    .from('season_participants')
    .update({ draft_position: position })
    .eq('id', participantId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/leagues/${leagueId}`, 'layout')
  return { success: true }
}
