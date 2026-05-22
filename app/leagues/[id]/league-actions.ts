'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

// Bramka: tylko super admin może usuwać/przywracać ligi.
async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Brak sesji — zaloguj się ponownie', supabase: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_super_admin) {
    return { error: 'Tylko super admin może usuwać ligi', supabase: null }
  }

  return { error: null, supabase }
}

export async function deleteLeague(leagueId: string) {
  const { error: authError, supabase } = await requireSuperAdmin()
  if (authError || !supabase) return { error: authError }

  // Soft delete: nie kasujemy wiersza, tylko zmieniamy status.
  const { error } = await supabase
    .from('leagues')
    .update({ status: 'deleted' })
    .eq('id', leagueId)
    .eq('status', 'active') // tylko aktywną ligę da się usunąć

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}

export async function restoreLeague(leagueId: string) {
  const { error: authError, supabase } = await requireSuperAdmin()
  if (authError || !supabase) return { error: authError }

  const { error } = await supabase
    .from('leagues')
    .update({ status: 'active' })
    .eq('id', leagueId)
    .eq('status', 'deleted') // tylko usuniętą ligę da się przywrócić

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}