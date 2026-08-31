'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

type PlayerData = {
  full_name: string
  club: string
  position: string
  league: string
}

function validatePlayerData(data: PlayerData): string | null {
  const name = data.full_name.trim()
  const club = data.club.trim()
  const league = data.league.trim()
  if (!name || name.length > 100) return 'Imię i nazwisko jest wymagane (max 100 znaków)'
  if (!club || club.length > 100) return 'Klub jest wymagany (max 100 znaków)'
  if (!['napastnik', 'pomocnik'].includes(data.position)) return 'Pozycja musi być napastnik lub pomocnik'
  if (!league || league.length > 50) return 'Liga jest wymagana (max 50 znaków)'
  return null
}

async function requireLeagueModOrAdmin(leagueId: string) {
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

  const isLeagueAdminOrMod = membership?.role === 'admin' || membership?.role === 'mod'

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  const isSuperAdmin = profile?.is_super_admin ?? false

  if (!isLeagueAdminOrMod && !isSuperAdmin) {
    return { error: 'Nie masz uprawnień do zarządzania składem w tej lidze', supabase: null }
  }

  return { error: null, supabase }
}

export async function addRosterPlayer(seasonParticipantId: string, playerData: PlayerData) {
  const validationError = validatePlayerData(playerData)
  if (validationError) return { error: validationError }

  const supabasePre = await createClient()
  const { data: participant } = await supabasePre
    .from('season_participants')
    .select('seasons(league_id, status)')
    .eq('id', seasonParticipantId)
    .maybeSingle()

  if (!participant) return { error: 'Uczestnik sezonu nie istnieje' }
  const leagueId = (participant as any).seasons?.league_id as string | undefined
  const seasonStatus = (participant as any).seasons?.status as string | undefined

  if (!leagueId) return { error: 'Nie można ustalić ligi dla tego uczestnika' }

  const { error: authError, supabase } = await requireLeagueModOrAdmin(leagueId)
  if (authError || !supabase) return { error: authError }

  if (seasonStatus !== 'locked') {
    return { error: 'Skład można edytować tylko po zamknięciu zapisów' }
  }

  const { count } = await supabase
    .from('roster_players')
    .select('id', { count: 'exact', head: true })
    .eq('season_participant_id', seasonParticipantId)

  if (count !== null && count >= 9) {
    return { error: 'Skład jest już kompletny (9 zawodników)' }
  }

  const { error: insertError } = await supabase
    .from('roster_players')
    .insert({
      season_participant_id: seasonParticipantId,
      full_name: playerData.full_name.trim(),
      club: playerData.club.trim(),
      position: playerData.position,
      league: playerData.league.trim(),
    })

  if (insertError) return { error: insertError.message }

  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}

export async function updateRosterPlayer(playerId: string, playerData: PlayerData) {
  const validationError = validatePlayerData(playerData)
  if (validationError) return { error: validationError }

  const supabasePre = await createClient()
  const { data: player } = await supabasePre
    .from('roster_players')
    .select('season_participant_id, season_participants(seasons(league_id, status))')
    .eq('id', playerId)
    .maybeSingle()

  if (!player) return { error: 'Zawodnik nie istnieje' }
  const leagueId = (player as any).season_participants?.seasons?.league_id as string | undefined
  const seasonStatus = (player as any).season_participants?.seasons?.status as string | undefined

  if (!leagueId) return { error: 'Nie można ustalić ligi dla tego zawodnika' }

  const { error: authError, supabase } = await requireLeagueModOrAdmin(leagueId)
  if (authError || !supabase) return { error: authError }

  if (seasonStatus !== 'locked') {
    return { error: 'Skład można edytować tylko po zamknięciu zapisów' }
  }

  const { error: updateError } = await supabase
    .from('roster_players')
    .update({
      full_name: playerData.full_name.trim(),
      club: playerData.club.trim(),
      position: playerData.position,
      league: playerData.league.trim(),
    })
    .eq('id', playerId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}

export async function deleteRosterPlayer(playerId: string) {
  const supabasePre = await createClient()
  const { data: player } = await supabasePre
    .from('roster_players')
    .select('season_participant_id, season_participants(seasons(league_id, status))')
    .eq('id', playerId)
    .maybeSingle()

  if (!player) return { error: 'Zawodnik nie istnieje' }
  const leagueId = (player as any).season_participants?.seasons?.league_id as string | undefined
  const seasonStatus = (player as any).season_participants?.seasons?.status as string | undefined

  if (!leagueId) return { error: 'Nie można ustalić ligi dla tego zawodnika' }

  const { error: authError, supabase } = await requireLeagueModOrAdmin(leagueId)
  if (authError || !supabase) return { error: authError }

  if (seasonStatus !== 'locked') {
    return { error: 'Skład można edytować tylko po zamknięciu zapisów' }
  }

  const { error: deleteError } = await supabase
    .from('roster_players')
    .delete()
    .eq('id', playerId)

  if (deleteError) return { error: deleteError.message }

  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}
