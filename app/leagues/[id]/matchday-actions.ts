'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

type MatchdayData = {
  date_from: string | null
  date_to: string | null
  deadline: string | null
}

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
    return { error: 'Nie masz uprawnień do zarządzania kolejkami tej ligi', supabase: null }
  }

  return { error: null, supabase }
}

export async function updateMatchday(matchdayId: string, data: MatchdayData) {
  const supabasePre = await createClient()
  const { data: matchday } = await supabasePre
    .from('matchdays')
    .select('season_id, seasons(league_id)')
    .eq('id', matchdayId)
    .maybeSingle()

  if (!matchday) return { error: 'Kolejka nie istnieje' }
  const leagueId = (matchday as any).seasons?.league_id as string | undefined
  if (!leagueId) return { error: 'Nie można ustalić ligi dla tej kolejki' }

  const { error: authError, supabase } = await requireLeagueAdminOrSuperAdmin(leagueId)
  if (authError || !supabase) return { error: authError }

  if (data.date_from && data.date_to && data.date_from > data.date_to) {
    return { error: 'Data końca musi być równa lub późniejsza niż data początku' }
  }

  const { error: updateError } = await supabase
    .from('matchdays')
    .update({
      date_from: data.date_from || null,
      date_to: data.date_to || null,
      deadline: data.deadline || null,
    })
    .eq('id', matchdayId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/leagues/${leagueId}`, 'layout')
  return { success: true }
}
