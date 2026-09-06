'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

async function requireLeagueModOrAdmin(leagueId: string) {
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

  const isSuperAdmin = profile?.is_super_admin ?? false

  if (!isModOrAdmin && !isSuperAdmin) {
    return { error: 'Nie masz uprawnień do wpisywania wyników w tej lidze', supabase: null }
  }

  return { error: null, supabase }
}

type ResultInput = {
  roster_player_id: string
  season_participant_id: string
  goals: number
  own_goals: number
}

export async function setMatchResults(
  matchdayId: string,
  results: ResultInput[]
): Promise<{ success: true; saved: number } | { error: string }> {
  const supabasePre = await createClient()
  const { data: matchday } = await supabasePre
    .from('matchdays')
    .select('id, seasons(league_id)')
    .eq('id', matchdayId)
    .maybeSingle()

  if (!matchday) return { error: 'Kolejka nie istnieje' }
  const leagueId = (matchday as any).seasons?.league_id as string | undefined
  if (!leagueId) return { error: 'Nie można ustalić ligi dla tej kolejki' }

  const { error: authError, supabase } = await requireLeagueModOrAdmin(leagueId)
  if (authError || !supabase) return { error: authError ?? 'Błąd autoryzacji' }

  for (const r of results) {
    if (!Number.isInteger(r.goals) || r.goals < 0) return { error: 'Liczba bramek musi być nieujemna' }
    if (!Number.isInteger(r.own_goals) || r.own_goals < 0) return { error: 'Liczba samobójczych musi być nieujemna' }
  }

  if (results.length === 0) return { success: true, saved: 0 }

  const now = new Date().toISOString()
  const rows = results.map(r => ({
    matchday_id: matchdayId,
    season_participant_id: r.season_participant_id,
    roster_player_id: r.roster_player_id,
    goals: r.goals,
    own_goals: r.own_goals,
    updated_at: now,
  }))

  const { error: upsertError } = await supabase
    .from('match_results')
    .upsert(rows, { onConflict: 'matchday_id,roster_player_id' })

  if (upsertError) return { error: upsertError.message }

  revalidatePath(`/leagues/${leagueId}`, 'layout')
  return { success: true, saved: results.length }
}
