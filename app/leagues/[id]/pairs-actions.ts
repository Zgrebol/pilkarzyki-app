'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

// --- Algorytm round-robin ---

function computeRounds(n: number): number {
  if (n < 2) return 0
  return n % 2 === 0 ? (n - 1) * 2 : n * 2
}

type Round = {
  pairs: Array<{ home: string; away: string }>
  byes: string[]
}

function buildRoundRobin(participantIds: string[]): Round[] {
  const n = participantIds.length
  if (n < 2) return []

  const hasBye = n % 2 === 1
  const teams = hasBye ? [...participantIds, 'BYE'] : [...participantIds]
  const N = teams.length // zawsze parzyste

  const positions = [...teams]
  const firstLeg: Round[] = []

  for (let r = 0; r < N - 1; r++) {
    const pairs: Array<{ home: string; away: string }> = []
    const byes: string[] = []

    for (let i = 0; i < N / 2; i++) {
      const home = positions[i]
      const away = positions[N - 1 - i]
      if (home === 'BYE') byes.push(away)
      else if (away === 'BYE') byes.push(home)
      else pairs.push({ home, away })
    }

    firstLeg.push({ pairs, byes })

    // Rotacja: positions[0] stałe, reszta przesuwa się o 1 (ostatni idzie na index 1)
    const last = positions[N - 1]
    for (let i = N - 1; i > 1; i--) positions[i] = positions[i - 1]
    positions[1] = last
  }

  // Rewanże — odwrócone home/away
  const secondLeg: Round[] = firstLeg.map(r => ({
    pairs: r.pairs.map(p => ({ home: p.away, away: p.home })),
    byes: [...r.byes],
  }))

  return [...firstLeg, ...secondLeg]
}

// --- Helpery uprawnień ---

async function requireLeagueAdminOrSuperAdmin(leagueId: string) {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (membership?.role !== 'admin' && !profile?.is_super_admin) {
    return { error: 'Nie masz uprawnień do zarządzania parami meczowymi', supabase: null }
  }

  return { error: null, supabase }
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Brak sesji — zaloguj się ponownie', supabase: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_super_admin) {
    return { error: 'Tylko super admin może wykonać tę operację', supabase: null }
  }

  return { error: null, supabase }
}

// --- Rdzeń generowania par (współdzielony przez generate i regenerate) ---

type PairGenResult =
  | { error: string }
  | { success: true; pairs: number; byes: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runPairGeneration(supabase: any, seasonId: string): Promise<PairGenResult> {
  // 1. Pobierz uczestników z tierami
  const { data: participants } = await supabase
    .from('season_participants')
    .select('id, tier')
    .eq('season_id', seasonId)

  const all = (participants ?? []) as Array<{ id: string; tier: number }>
  const tier1 = all.filter(p => p.tier === 1)
  const tier2 = all.filter(p => p.tier === 2)

  // Wariant A: pomijaj poziomy z <2 uczestników (nie blokuj)
  const activeTiers: Array<{ ids: string[]; tier: 1 | 2 }> = []
  if (tier1.length >= 2) activeTiers.push({ ids: tier1.map(p => p.id), tier: 1 })
  if (tier2.length >= 2) activeTiers.push({ ids: tier2.map(p => p.id), tier: 2 })

  if (activeTiers.length === 0) {
    return { error: 'Żaden poziom rozgrywek nie ma wystarczającej liczby uczestników (minimum 2)' }
  }

  // 2. Oblicz wymaganą liczbę kolejek
  const required = Math.max(
    tier1.length >= 2 ? computeRounds(tier1.length) : 0,
    tier2.length >= 2 ? computeRounds(tier2.length) : 0,
  )

  // 3. Pobierz istniejące kolejki
  const { data: matchdayRows } = await supabase
    .from('matchdays')
    .select('id, number')
    .eq('season_id', seasonId)
    .order('number', { ascending: true })

  const currentMatchdays = (matchdayRows ?? []) as Array<{ id: string; number: number }>
  const M = currentMatchdays.length

  let allMatchdays = currentMatchdays

  // 4. Wyrównaj liczbę kolejek
  if (required > M) {
    const toInsert = Array.from({ length: required - M }, (_, i) => ({
      season_id: seasonId,
      number: M + i + 1,
    }))
    const { data: inserted, error: insErr } = await supabase
      .from('matchdays')
      .insert(toInsert)
      .select('id, number')
    if (insErr) return { error: insErr.message }
    allMatchdays = [...currentMatchdays, ...(inserted ?? [])]
    allMatchdays.sort((a, b) => a.number - b.number)
  } else if (required < M) {
    const trailingIds = currentMatchdays
      .filter(m => m.number > required)
      .map(m => m.id)

    if (trailingIds.length > 0) {
      const { count: lineupCount } = await supabase
        .from('matchday_lineups')
        .select('id', { count: 'exact', head: true })
        .in('matchday_id', trailingIds)

      if ((lineupCount ?? 0) > 0) {
        return {
          error: `Kolejki ${required + 1}–${M} mają wpisane trójki meczowe i nie mogą zostać usunięte. Użyj Awaryjnego otwarcia, żeby zacząć od nowa.`,
        }
      }

      const { error: delErr } = await supabase
        .from('matchdays')
        .delete()
        .in('id', trailingIds)
      if (delErr) return { error: delErr.message }

      allMatchdays = currentMatchdays.filter(m => m.number <= required)
    }
  }

  // 5. Wygeneruj pary i pauzy dla każdego aktywnego poziomu
  const pairsToInsert: Array<{
    matchday_id: string
    home_participant_id: string
    away_participant_id: string
    tier: number
  }> = []

  const byesToInsert: Array<{
    matchday_id: string
    participant_id: string
    tier: number
  }> = []

  for (const { ids, tier } of activeTiers) {
    const rounds = buildRoundRobin(ids)
    for (let i = 0; i < rounds.length; i++) {
      const matchday = allMatchdays[i]
      if (!matchday) continue

      for (const pair of rounds[i].pairs) {
        pairsToInsert.push({
          matchday_id: matchday.id,
          home_participant_id: pair.home,
          away_participant_id: pair.away,
          tier,
        })
      }
      for (const byeId of rounds[i].byes) {
        byesToInsert.push({
          matchday_id: matchday.id,
          participant_id: byeId,
          tier,
        })
      }
    }
  }

  // 6. Zapisz w bazie
  if (pairsToInsert.length > 0) {
    const { error: pairsErr } = await supabase
      .from('matchday_pairs')
      .insert(pairsToInsert)
    if (pairsErr) return { error: pairsErr.message }
  }

  if (byesToInsert.length > 0) {
    const { error: byesErr } = await supabase
      .from('matchday_byes')
      .insert(byesToInsert)
    if (byesErr) return { error: byesErr.message }
  }

  return { success: true, pairs: pairsToInsert.length, byes: byesToInsert.length }
}

// --- Akcje publiczne ---

export async function generatePairs(seasonId: string) {
  const supabasePre = await createClient()
  const { data: season } = await supabasePre
    .from('seasons')
    .select('id, league_id, status')
    .eq('id', seasonId)
    .maybeSingle()

  if (!season) return { error: 'Sezon nie istnieje' }
  if (season.status !== 'locked') return { error: 'Pary można generować tylko w zamkniętym sezonie' }

  const { error: authError, supabase } = await requireLeagueAdminOrSuperAdmin(season.league_id)
  if (authError || !supabase) return { error: authError }

  // Sprawdź czy pary już istnieją
  const { data: mds } = await supabase
    .from('matchdays')
    .select('id')
    .eq('season_id', seasonId)

  const matchdayIds = (mds ?? []).map((m: any) => m.id)
  if (matchdayIds.length > 0) {
    const { count: existing } = await supabase
      .from('matchday_pairs')
      .select('id', { count: 'exact', head: true })
      .in('matchday_id', matchdayIds)

    if ((existing ?? 0) > 0) {
      return { error: 'Pary są już wygenerowane. Użyj funkcji Regeneruj pary (tylko super admin).' }
    }
  }

  const result = await runPairGeneration(supabase, seasonId)
  if ('error' in result) return result

  revalidatePath(`/leagues/${season.league_id}`, 'layout')
  return result
}

export async function regeneratePairs(seasonId: string, confirmLeagueName: string) {
  const supabasePre = await createClient()
  const { data: season } = await supabasePre
    .from('seasons')
    .select('id, league_id, status')
    .eq('id', seasonId)
    .maybeSingle()

  if (!season) return { error: 'Sezon nie istnieje' }
  if (season.status !== 'locked') return { error: 'Nie ma zamkniętego sezonu' }

  const { error: authError, supabase } = await requireSuperAdmin()
  if (authError || !supabase) return { error: authError }

  // Potwierdzenie nazwy ligi
  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', season.league_id)
    .maybeSingle()

  if (!league) return { error: 'Liga nie istnieje' }

  if (confirmLeagueName.trim().toLowerCase() !== league.name.trim().toLowerCase()) {
    return { error: 'Podana nazwa ligi nie pasuje. Regeneracja anulowana.' }
  }

  // Skasuj istniejące pary i pauzy
  const { data: mds } = await supabase
    .from('matchdays')
    .select('id')
    .eq('season_id', seasonId)

  const matchdayIds = (mds ?? []).map((m: any) => m.id)
  if (matchdayIds.length > 0) {
    const { error: e1 } = await supabase
      .from('matchday_pairs')
      .delete()
      .in('matchday_id', matchdayIds)
    if (e1) return { error: e1.message }

    const { error: e2 } = await supabase
      .from('matchday_byes')
      .delete()
      .in('matchday_id', matchdayIds)
    if (e2) return { error: e2.message }
  }

  const result = await runPairGeneration(supabase, seasonId)
  if ('error' in result) return result

  revalidatePath(`/leagues/${season.league_id}`, 'layout')
  return result
}

export async function emergencyReopen(seasonId: string, confirmLeagueName: string) {
  const supabasePre = await createClient()
  const { data: season } = await supabasePre
    .from('seasons')
    .select('id, league_id, status')
    .eq('id', seasonId)
    .maybeSingle()

  if (!season) return { error: 'Sezon nie istnieje' }
  if (season.status !== 'locked') return { error: 'Nie ma zamkniętego sezonu' }

  const { error: authError, supabase } = await requireSuperAdmin()
  if (authError || !supabase) return { error: authError }

  // Potwierdzenie nazwy ligi
  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', season.league_id)
    .maybeSingle()

  if (!league) return { error: 'Liga nie istnieje' }

  if (confirmLeagueName.trim().toLowerCase() !== league.name.trim().toLowerCase()) {
    return { error: 'Podana nazwa ligi nie pasuje. Operacja anulowana.' }
  }

  // Pobierz ID kolejek
  const { data: mds } = await supabase
    .from('matchdays')
    .select('id')
    .eq('season_id', seasonId)

  const matchdayIds = (mds ?? []).map((m: any) => m.id)

  if (matchdayIds.length > 0) {
    // 1. matchday_lineups
    const { error: e1 } = await supabase
      .from('matchday_lineups')
      .delete()
      .in('matchday_id', matchdayIds)
    if (e1) return { error: e1.message }

    // 2. matchday_pairs
    const { error: e2 } = await supabase
      .from('matchday_pairs')
      .delete()
      .in('matchday_id', matchdayIds)
    if (e2) return { error: e2.message }

    // 3. matchday_byes
    const { error: e3 } = await supabase
      .from('matchday_byes')
      .delete()
      .in('matchday_id', matchdayIds)
    if (e3) return { error: e3.message }

    // 4. matchdays
    const { error: e4 } = await supabase
      .from('matchdays')
      .delete()
      .eq('season_id', seasonId)
    if (e4) return { error: e4.message }
  }

  // 5. season_participants (cascaduje roster_players jeśli ON DELETE CASCADE)
  const { error: e5 } = await supabase
    .from('season_participants')
    .delete()
    .eq('season_id', seasonId)
  if (e5) return { error: e5.message }

  // 6. Przywróć status rejestracji
  const { error: e6 } = await supabase
    .from('seasons')
    .update({ status: 'registration' })
    .eq('id', seasonId)
  if (e6) return { error: e6.message }

  revalidatePath(`/leagues/${season.league_id}`, 'layout')
  return { success: true }
}

export async function setParticipantTier(participantId: string, tier: 1 | 2) {
  if (tier !== 1 && tier !== 2) return { error: 'Nieprawidłowy poziom (1 lub 2)' }

  const supabasePre = await createClient()
  const { data: participant } = await supabasePre
    .from('season_participants')
    .select('id, season_id, seasons(league_id, status)')
    .eq('id', participantId)
    .maybeSingle()

  if (!participant) return { error: 'Uczestnik nie istnieje' }

  const leagueId = (participant as any).seasons?.league_id as string | undefined
  const seasonStatus = (participant as any).seasons?.status as string | undefined
  const seasonId = (participant as any).season_id as string | undefined

  if (!leagueId || !seasonId) return { error: 'Nie można ustalić ligi dla tego uczestnika' }
  if (seasonStatus !== 'locked') return { error: 'Poziom można zmieniać tylko po zamknięciu zapisów' }

  const { error: authError, supabase } = await requireLeagueAdminOrSuperAdmin(leagueId)
  if (authError || !supabase) return { error: authError }

  // Zablokuj zmianę jeśli pary już istnieją
  const { data: mds } = await supabase
    .from('matchdays')
    .select('id')
    .eq('season_id', seasonId)

  const matchdayIds = (mds ?? []).map((m: any) => m.id)
  if (matchdayIds.length > 0) {
    const { count } = await supabase
      .from('matchday_pairs')
      .select('id', { count: 'exact', head: true })
      .in('matchday_id', matchdayIds)

    if ((count ?? 0) > 0) {
      return { error: 'Nie można zmienić poziomu — pary są już wygenerowane. Użyj Regeneruj pary.' }
    }
  }

  const { error: updateError } = await supabase
    .from('season_participants')
    .update({ tier })
    .eq('id', participantId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/leagues/${leagueId}`, 'layout')
  return { success: true }
}
