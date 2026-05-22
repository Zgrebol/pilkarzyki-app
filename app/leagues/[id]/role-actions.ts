'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

type Role = 'player' | 'mod' | 'admin'

// Bramka: kto jest zalogowany i jakie ma uprawnienia w tej lidze.
// Zwraca rolę pytającego w lidze + czy super admin — decyzję o tym,
// CO wolno, podejmujemy w changeMemberRole zależnie od typu zmiany.
async function getRoleManagementContext(leagueId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Brak sesji — zaloguj się ponownie', supabase: null, user: null, isLeagueAdmin: false, isSuperAdmin: false }
  }

  const { data: membership } = await supabase
    .from('league_members')
    .select('role, status')
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

  return { error: null, supabase, user, isLeagueAdmin, isSuperAdmin }
}

export async function changeMemberRole(leagueId: string, memberId: string, newRole: Role) {
  const { error: authError, supabase, user, isLeagueAdmin, isSuperAdmin } =
    await getRoleManagementContext(leagueId)
  if (authError || !supabase || !user) return { error: authError }

  // Walidacja wejścia
  if (!['player', 'mod', 'admin'].includes(newRole)) {
    return { error: 'Nieprawidłowa rola' }
  }

  // Pobierz target — musi być aktywnym członkiem TEJ ligi
  const { data: target } = await supabase
    .from('league_members')
    .select('id, user_id, role, status')
    .eq('id', memberId)
    .eq('league_id', leagueId)
    .maybeSingle()

  if (!target) {
    return { error: 'Ten członek nie istnieje w tej lidze' }
  }
  if (target.status !== 'active') {
    return { error: 'Rolę można zmieniać tylko aktywnym członkom ligi' }
  }

  // Nie zmieniasz własnej roli przez tę akcję
  if (target.user_id === user.id) {
    return { error: 'Nie możesz zmienić własnej roli' }
  }

  // Bez zmiany — nic nie rób
  if (target.role === newRole) {
    return { error: `Ten członek już ma rolę „${newRole}"` }
  }

  // DWUPOZIOMOWA BRAMKA
  // Czy ta operacja DOTYKA roli admin? (nadanie admina LUB odebranie admina)
  const touchesAdmin = newRole === 'admin' || target.role === 'admin'

  if (touchesAdmin) {
    // Nadawanie/odbieranie adminostwa — tylko super admin
    if (!isSuperAdmin) {
      return { error: 'Tylko super admin może nadawać i odbierać rolę admina ligi' }
    }
  } else {
    // player ↔ mod — admin ligi lub super admin
    if (!isLeagueAdmin && !isSuperAdmin) {
      return { error: 'Nie masz uprawnień do zmiany ról w tej lidze' }
    }
  }

  // UPDATE wyłącznie pola role (defense-in-depth: nie przepuszczamy innych pól)
  const { error: updateError } = await supabase
    .from('league_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('league_id', leagueId)

  if (updateError) {
    // Trigger prevent_last_admin_removal rzuca przy próbie odebrania
    // adminostwa ostatniemu aktywnemu adminowi (P0001, komunikat po polsku).
    const msg = updateError.message ?? ''
    if (msg.includes('przynajmniej jednego aktywnego admina')) {
      return { error: 'Nie można odebrać roli admina — to ostatni aktywny admin ligi. Najpierw nadaj komuś innemu rolę admina.' }
    }
    return { error: msg || 'Nie udało się zmienić roli' }
  }

  revalidatePath(`/leagues/${leagueId}`)
  revalidatePath('/')
  return { success: true }
}