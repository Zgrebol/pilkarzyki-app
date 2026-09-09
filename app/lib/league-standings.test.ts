import { describe, it, expect } from 'vitest'
import { calculateStandings, type ParticipantInput, type MatchInput } from './league-standings'

const p = (id: string, opts: Partial<ParticipantInput> = {}): ParticipantInput => ({
  id,
  team_name: id.toUpperCase(),
  draft_position: null,
  manual_position_override: null,
  ...opts,
})

const m = (home: string, away: string, hs: number, as_: number): MatchInput => ({
  home_participant_id: home,
  away_participant_id: away,
  home_score: hs,
  away_score: as_,
})

describe('calculateStandings', () => {
  it('Test 1 — podstawowy: wyraźny zwycięzca', () => {
    const participants = [p('a'), p('b')]
    const matches = [
      m('a', 'b', 3, 0), // A wygrywa
      m('b', 'a', 0, 2), // A wygrywa na wyjeździe
    ]
    // A: 2M 2W Pkt=6 B+=5 B-=0; B: 2M 0W Pkt=0 B+=0 B-=5
    const rows = calculateStandings(participants, matches)
    expect(rows.find(r => r.participant_id === 'a')?.position).toBe(1)
    expect(rows.find(r => r.participant_id === 'b')?.position).toBe(2)
    expect(rows.find(r => r.participant_id === 'a')?.points).toBe(6)
    expect(rows.find(r => r.participant_id === 'b')?.points).toBe(0)
  })

  it('Test 2 — Level 2: B+ rozstrzyga przy równych punktach', () => {
    const participants = [p('a'), p('b'), p('c')]
    const matches = [
      m('a', 'c', 2, 0), // A wygrywa 2-0
      m('b', 'c', 1, 0), // B wygrywa 1-0
      m('a', 'b', 0, 0), // remis
      m('b', 'a', 0, 0), // remis
    ]
    // A: Pkt=5 B+=2; B: Pkt=5 B+=1; C: Pkt=0
    // L1: A=B=5 (tie); L2: A B+=2 > B B+=1 → A wyżej
    const rows = calculateStandings(participants, matches)
    expect(rows.find(r => r.participant_id === 'a')?.position).toBe(1)
    expect(rows.find(r => r.participant_id === 'b')?.position).toBe(2)
    expect(rows.find(r => r.participant_id === 'c')?.position).toBe(3)
  })

  it('Test 3 — Level 3: B- desc (więcej straconych = wyżej przy równych B+)', () => {
    const participants = [p('a'), p('b'), p('c')]
    const matches = [
      m('a', 'b', 2, 1), // A wygrywa
      m('b', 'a', 2, 1), // B wygrywa
      m('a', 'c', 0, 1), // C wygrywa, A traci 1
      m('b', 'c', 0, 2), // C wygrywa, B traci 2
    ]
    // A: Pkt=3 B+=3 B-=4; B: Pkt=3 B+=3 B-=5; C: Pkt=6
    // L1: C=6 > A=B=3; L2: tied (B+=3=3); L3: B B-=5 > A B-=4 → B wyżej
    const rows = calculateStandings(participants, matches)
    expect(rows.find(r => r.participant_id === 'c')?.position).toBe(1)
    expect(rows.find(r => r.participant_id === 'b')?.position).toBe(2)
    expect(rows.find(r => r.participant_id === 'a')?.position).toBe(3)
  })

  it('Test 4 — Level 5: suma punktów przeciwników rozstrzyga', () => {
    // A i B identyczne na L1-L4, ale A grało z silniejszymi przeciwnikami
    const participants = [p('a'), p('b'), p('c'), p('d'), p('e')]
    const matches = [
      m('a', 'c', 1, 0), // A wygrywa; C przegrywa
      m('d', 'a', 1, 0), // D wygrywa; A przegrywa
      m('b', 'c', 1, 0), // B wygrywa; C przegrywa
      m('e', 'b', 1, 0), // E wygrywa; B przegrywa
      m('d', 'e', 2, 0), // D wygrywa ponownie → D ma 6pkt łącznie
    ]
    // A: Pkt=3 W=1 B+=1 B-=1; B: Pkt=3 W=1 B+=1 B-=1 (identyczne)
    // D: Pkt=6; E: Pkt=3 B-=2; C: Pkt=0
    // L3: E B-=2 > A=B B-=1 → E wyżej niż A i B
    // L5 opp_pts: A grało vs C(0) i D(6) = 6; B grało vs C(0) i E(3) = 3 → A wyżej
    const rows = calculateStandings(participants, matches)
    expect(rows.find(r => r.participant_id === 'd')?.position).toBe(1)
    expect(rows.find(r => r.participant_id === 'e')?.position).toBe(2)
    expect(rows.find(r => r.participant_id === 'a')?.position).toBe(3)
    expect(rows.find(r => r.participant_id === 'b')?.position).toBe(4)
    expect(rows.find(r => r.participant_id === 'c')?.position).toBe(5)
  })

  it('Test 5 — Level 6: draft_position rozstrzyga przy pełnym remisie', () => {
    const participants = [
      p('a', { draft_position: 2 }),
      p('b', { draft_position: 1 }),
    ]
    const matches = [
      m('a', 'b', 1, 1), // remis
      m('b', 'a', 1, 1), // remis
    ]
    // A i B identyczne na L1-L5; L6: B draft_pos=1 < A draft_pos=2 → B wyżej
    const rows = calculateStandings(participants, matches)
    expect(rows.find(r => r.participant_id === 'b')?.position).toBe(1)
    expect(rows.find(r => r.participant_id === 'a')?.position).toBe(2)
  })

  it('Test 6 — manual_position_override: super admin nadpisuje pozycję', () => {
    const participants = [
      p('a'),
      p('b'),
      p('c', { manual_position_override: 1 }),
    ]
    const matches = [
      m('a', 'b', 3, 0), // A wygrywa wyraźnie
      m('a', 'c', 3, 0), // A wygrywa wyraźnie
    ]
    // Bez override: A=1 (Pkt=6), B=2 (Pkt=0 B-=3), C=3 (Pkt=0 B-=3, id 'c'>'b')
    // Z override C→1: C=1(ręczna), A=2, B=3
    const rows = calculateStandings(participants, matches)
    const cRow = rows.find(r => r.participant_id === 'c')!
    const aRow = rows.find(r => r.participant_id === 'a')!
    const bRow = rows.find(r => r.participant_id === 'b')!
    expect(cRow.position).toBe(1)
    expect(cRow.is_manual).toBe(true)
    expect(aRow.position).toBe(2)
    expect(aRow.is_manual).toBe(false)
    expect(bRow.position).toBe(3)
  })
})
