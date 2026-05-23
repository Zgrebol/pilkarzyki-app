'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

async function requireLeagueAdminOrSuperAdmin(leagueId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Brak sesji — zaloguj się ponownie', supabase: null }
  }

  const { data: membership } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const isLeagueAdmin = membership?.role === 'admin'

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  const isSuperAdmin = profile?.is_super_admin ?? false

  if (!isLeagueAdmin && !isSuperAdmin) {
    return { error: 'Nie masz uprawnień do zarządzania sezonem tej ligi', supabase: null }
  }

  return { error: null, supabase }
}

export async function closeRegistration(leagueId: string) {
  const { error: authError, supabase } = await requireLeagueAdminOrSuperAdmin(leagueId)
  if (authError || !supabase) return { error: authError }

  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('league_id', leagueId)
    .eq('status', 'registration')
    .maybeSingle()

  if (!season) {
    return { error: 'Zapisy już zamknięte lub brak otwartego sezonu' }
  }

  const { error: updateError } = await supabase
    .from('seasons')
    .update({ status: 'locked' })
    .eq('id', season.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}

export async function reopenRegistration(leagueId: string) {
  const { error: authError, supabase } = await requireLeagueAdminOrSuperAdmin(leagueId)
  if (authError || !supabase) return { error: authError }

  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('league_id', leagueId)
    .eq('status', 'locked')
    .maybeSingle()

  if (!season) {
    return { error: 'Brak zamkniętego sezonu do otwarcia' }
  }

  const { error: updateError } = await supabase
    .from('seasons')
    .update({ status: 'registration' })
    .eq('id', season.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}
