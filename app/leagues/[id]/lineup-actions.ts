'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

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

  const isModOrAdmin = membership?.role === 'admin' || membership?.role === 'mod'

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  const isSuperAdmin = profile?.is_super_admin ?? false

  if (!isModOrAdmin && !isSuperAdmin) {
    return { error: 'Nie masz uprawnień do zarządzania trójkami w tej lidze', supabase: null }
  }

  return { error: null, supabase }
}

async function requireOwnerOrModOrAdmin(leagueId: string, seasonParticipantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Brak sesji — zaloguj się ponownie', supabase: null, isOwnerOnly: false }
  }

  const { data: participant } = await supabase
    .from('season_participants')
    .select('id, teams(owner_id)')
    .eq('id', seasonParticipantId)
    .maybeSingle()

  const isOwner = (participant as any)?.teams?.owner_id === user.id

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

  if (!isOwner && !isModOrAdmin && !isSuperAdmin) {
    return { error: 'Brak uprawnień do ustawiania trójki dla tej drużyny', supabase: null, isOwnerOnly: false }
  }

  return {
    error: null,
    supabase,
    isOwnerOnly: isOwner && !isModOrAdmin && !isSuperAdmin,
  }
}

export async function setLineup(
  matchdayId: string,
  seasonParticipantId: string,
  player1Id: string,
  player2Id: string,
  player3Id: string
) {
  if (player1Id === player2Id || player1Id === player3Id || player2Id === player3Id) {
    return { error: 'Wszyscy trzej zawodnicy muszą być różni' }
  }

  const supabasePre = await createClient()
  const { data: matchday } = await supabasePre
    .from('matchdays')
    .select('id, deadline, seasons(league_id)')
    .eq('id', matchdayId)
    .maybeSingle()

  if (!matchday) return { error: 'Kolejka nie istnieje' }
  const leagueId = (matchday as any).seasons?.league_id as string | undefined
  if (!leagueId) return { error: 'Nie można ustalić ligi dla tej kolejki' }

  const { error: authError, supabase, isOwnerOnly } = await requireOwnerOrModOrAdmin(leagueId, seasonParticipantId)
  if (authError || !supabase) return { error: authError }

  if (isOwnerOnly) {
    const deadline = matchday.deadline as string | null
    if (!deadline || new Date(deadline) <= new Date()) {
      return { error: 'Deadline minął, nie można już zmieniać trójki' }
    }
  }

  const { data: playerDetails } = await supabase
    .from('roster_players')
    .select('id, position, league')
    .eq('season_participant_id', seasonParticipantId)
    .in('id', [player1Id, player2Id, player3Id])

  if (!playerDetails || playerDetails.length !== 3) {
    return { error: 'Jeden lub więcej zawodników nie należy do składu tej drużyny' }
  }

  // Reguła: 3 różne ligi (case-insensitive)
  const leagueEntries = (playerDetails as any[]).map((p: any) => ({
    orig: p.league?.trim() ?? '',
    lower: (p.league?.trim() ?? '').toLowerCase(),
  }))
  const uniqueLeagueLowers = new Set(leagueEntries.map(l => l.lower))
  if (uniqueLeagueLowers.size < 3) {
    const lowerCounts = new Map<string, number>()
    for (const l of leagueEntries) lowerCounts.set(l.lower, (lowerCounts.get(l.lower) ?? 0) + 1)
    const repeatedLower = [...lowerCounts.entries()].find(([, c]) => c > 1)?.[0]
    const repeated = leagueEntries.find(l => l.lower === repeatedLower)?.orig ?? repeatedLower
    return { error: `Zawodnicy muszą być z 3 różnych lig. Powtarzająca się liga: ${repeated}` }
  }

  // Reguła: maks. 2 napastników
  const forwardsCount = (playerDetails as any[]).filter((p: any) => p.position === 'napastnik').length
  if (forwardsCount > 2) {
    return { error: 'Maksymalnie 2 napastników w trójce' }
  }

  const { error: upsertError } = await supabase
    .from('matchday_lineups')
    .upsert({
      matchday_id: matchdayId,
      season_participant_id: seasonParticipantId,
      player1_id: player1Id,
      player2_id: player2Id,
      player3_id: player3Id,
      is_iron: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'matchday_id,season_participant_id' })

  if (upsertError) return { error: upsertError.message }

  revalidatePath(`/leagues/${leagueId}`)
  return { success: true }
}

export async function fillIronLineups(seasonId: string) {
  const supabasePre = await createClient()
  const { data: season } = await supabasePre
    .from('seasons')
    .select('league_id')
    .eq('id', seasonId)
    .maybeSingle()

  if (!season) return { error: 'Sezon nie istnieje' }
  const leagueId = (season as any).league_id as string

  const { error: authError, supabase } = await requireLeagueModOrAdmin(leagueId)
  if (authError || !supabase) return { error: authError }

  const now = new Date().toISOString()

  const { data: closedMatchdays } = await supabase
    .from('matchdays')
    .select('id')
    .eq('season_id', seasonId)
    .not('deadline', 'is', null)
    .lt('deadline', now)

  if (!closedMatchdays || closedMatchdays.length === 0) {
    return { success: true, filled: 0, incomplete: 0 }
  }

  const { data: participants } = await supabase
    .from('season_participants')
    .select('id')
    .eq('season_id', seasonId)

  if (!participants || participants.length === 0) {
    return { success: true, filled: 0, incomplete: 0 }
  }

  const matchdayIds = (closedMatchdays as any[]).map(m => m.id)
  const participantIds = (participants as any[]).map(p => p.id)

  const { data: existingLineups } = await supabase
    .from('matchday_lineups')
    .select('matchday_id, season_participant_id')
    .in('matchday_id', matchdayIds)

  const existingSet = new Set(
    (existingLineups ?? []).map((l: any) => `${l.matchday_id}_${l.season_participant_id}`)
  )

  const { data: allRosterPlayers } = await supabase
    .from('roster_players')
    .select('id, season_participant_id, league, position')
    .in('season_participant_id', participantIds)
    .order('created_at', { ascending: true })

  type PlayerData = { id: string; league: string; position: string }
  const rosterByParticipant = new Map<string, PlayerData[]>()
  for (const player of (allRosterPlayers ?? []) as any[]) {
    const list = rosterByParticipant.get(player.season_participant_id) ?? []
    list.push({ id: player.id, league: player.league ?? '', position: player.position ?? '' })
    rosterByParticipant.set(player.season_participant_id, list)
  }

  const toInsert: any[] = []
  let incompleteCount = 0

  for (const matchday of closedMatchdays as any[]) {
    for (const participant of participants as any[]) {
      const key = `${matchday.id}_${participant.id}`
      if (existingSet.has(key)) continue

      const players = rosterByParticipant.get(participant.id) ?? []

      const selected: PlayerData[] = []
      const usedLeagues = new Set<string>()
      let forwardsCount = 0

      for (const player of players) {
        if (selected.length === 3) break
        const leagueKey = player.league.trim().toLowerCase()
        if (usedLeagues.has(leagueKey)) continue
        if (player.position === 'napastnik' && forwardsCount === 2) continue
        selected.push(player)
        usedLeagues.add(leagueKey)
        if (player.position === 'napastnik') forwardsCount++
      }

      if (selected.length === 0) continue

      toInsert.push({
        matchday_id: matchday.id,
        season_participant_id: participant.id,
        player1_id: selected[0].id,
        player2_id: selected[1]?.id ?? null,
        player3_id: selected[2]?.id ?? null,
        is_iron: true,
      })
      if (selected.length < 3) incompleteCount++
    }
  }

  if (toInsert.length === 0) {
    return { success: true, filled: 0, incomplete: 0 }
  }

  const { error: insertError } = await supabase
    .from('matchday_lineups')
    .insert(toInsert)

  if (insertError) return { error: insertError.message }

  revalidatePath(`/leagues/${leagueId}`)
  return { success: true, filled: toInsert.length, incomplete: incompleteCount }
}
