'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

export async function createOwnTeam(leagueId: string, name: string) {
  const trimmed = name.trim()

  if (trimmed.length < 2 || trimmed.length > 30) {
    return { error: 'Nazwa drużyny musi mieć od 2 do 30 znaków' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Brak sesji — zaloguj się ponownie' }
  }

  const { data: membership } = await supabase
    .from('league_members')
    .select('status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) {
    return { error: 'Nie jesteś aktywnym członkiem tej ligi' }
  }

  const { data: existing } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existing) {
    return { error: 'Masz już drużynę w tej lidze' }
  }

  const { data: teamNameClash } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId)
    .ilike('name', trimmed)
    .maybeSingle()

  if (teamNameClash) {
    return { error: `Nazwa "${trimmed}" jest już zajęta w tej lidze` }
  }

  const { data: pendingClash } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', leagueId)
    .eq('status', 'pending')
    .ilike('team_name', trimmed)
    .maybeSingle()

  if (pendingClash) {
    return { error: `Nazwa "${trimmed}" jest już zajęta przez zgłoszenie w poczekalni` }
  }

  const { error: insertError } = await supabase
    .from('teams')
    .insert({ league_id: leagueId, owner_id: user.id, name: trimmed })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}
