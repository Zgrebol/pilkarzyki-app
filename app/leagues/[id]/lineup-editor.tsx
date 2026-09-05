'use client'

import { useState, useTransition } from 'react'
import { setLineup } from './lineup-actions'
import { Button } from '@/app/components/ui/Button'
import { PencilIcon } from '@heroicons/react/24/outline'

type RosterPlayer = {
  id: string
  full_name: string
  club: string
  position: string
  league: string
}

type Lineup = {
  player1_id: string
  player2_id: string | null
  player3_id: string | null
  is_iron: boolean
}

type Props = {
  matchdayId: string
  seasonParticipantId: string
  currentLineup: Lineup | null
  rosterPlayers: RosterPlayer[]
  canEdit: boolean
  compact?: boolean
}

export default function LineupEditor({
  matchdayId,
  seasonParticipantId,
  currentLineup,
  rosterPlayers,
  canEdit,
  compact = false,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [p1, setP1] = useState(currentLineup?.player1_id ?? '')
  const [p2, setP2] = useState(currentLineup?.player2_id ?? '')
  const [p3, setP3] = useState(currentLineup?.player3_id ?? '')
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const playerMap = new Map(rosterPlayers.map(p => [p.id, p]))

  function playerLabel(id: string) {
    const p = playerMap.get(id)
    if (!p) return '(nieznany zawodnik)'
    return `${p.full_name} (${p.league}) · ${p.position} · ${p.club}`
  }

  function validateLineup(ids: [string, string, string]): string | null {
    const selected = ids
      .map(id => playerMap.get(id))
      .filter((p): p is RosterPlayer => p !== undefined)
    if (selected.length < 3) return null

    const leagueEntries = selected.map(p => ({
      orig: p.league.trim(),
      lower: p.league.trim().toLowerCase(),
    }))
    const uniqueLowers = new Set(leagueEntries.map(l => l.lower))
    if (uniqueLowers.size < 3) {
      const lowerCounts = new Map<string, number>()
      for (const l of leagueEntries) lowerCounts.set(l.lower, (lowerCounts.get(l.lower) ?? 0) + 1)
      const repeatedLower = [...lowerCounts.entries()].find(([, c]) => c > 1)?.[0]
      const repeated = leagueEntries.find(l => l.lower === repeatedLower)?.orig ?? repeatedLower ?? ''
      return `Dwóch zawodników z ligi ${repeated}`
    }
    if (selected.filter(p => p.position === 'napastnik').length > 2) {
      return 'Maksymalnie 2 napastników'
    }
    return null
  }

  const clientValidationError = (p1 && p2 && p3) ? validateLineup([p1, p2, p3]) : null

  function handleEdit() {
    setP1(currentLineup?.player1_id ?? '')
    setP2(currentLineup?.player2_id ?? '')
    setP3(currentLineup?.player3_id ?? '')
    setServerError(null)
    setEditing(true)
  }

  function handleCancel() {
    setServerError(null)
    setEditing(false)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!p1 || !p2 || !p3) {
      setServerError('Wybierz trzech zawodników')
      return
    }
    if (p1 === p2 || p1 === p3 || p2 === p3) {
      setServerError('Zawodnicy muszą być różni')
      return
    }
    if (clientValidationError) return
    setServerError(null)
    startTransition(async () => {
      const res = await setLineup(matchdayId, seasonParticipantId, p1, p2, p3)
      if (res?.error) {
        setServerError(res.error)
      } else {
        setEditing(false)
      }
    })
  }

  if (!editing) {
    // Tryb kompaktowy: imiona inline, przycisk ołówek
    if (compact) {
      if (currentLineup) {
        const playerIds = (
          [currentLineup.player1_id, currentLineup.player2_id, currentLineup.player3_id] as (string | null)[]
        ).filter((id): id is string => id !== null)
        const names = playerIds.map(id => playerMap.get(id)?.full_name ?? '?')
        const isIncomplete = !currentLineup.player2_id || !currentLineup.player3_id
        return (
          <span className="inline-flex items-baseline flex-wrap gap-x-1">
            <span className={isIncomplete ? 'text-yellow-500' : 'text-gray-200'}>
              {names.join(', ')}
              {isIncomplete && (
                <em className="text-gray-500 text-xs ml-1 not-italic">(niekompletna)</em>
              )}
              {currentLineup.is_iron && !isIncomplete && (
                <span className="text-gray-600 text-xs ml-1" title="auto-wypełniona">⚙</span>
              )}
            </span>
            {canEdit && (
              <button
                onClick={handleEdit}
                className="text-blue-500 hover:text-blue-300 shrink-0 ml-0.5"
                title="Edytuj trójkę meczową"
              >
                <PencilIcon className="h-3 w-3 inline" />
              </button>
            )}
          </span>
        )
      }
      // Brak trójki w trybie kompaktowym
      return (
        <span className="inline-flex items-baseline gap-x-1">
          <em className="text-gray-500">Skład niewystawiony</em>
          {canEdit && (
            <button
              onClick={handleEdit}
              className="text-xs text-blue-500 hover:text-blue-300 shrink-0"
            >
              Wybierz
            </button>
          )}
        </span>
      )
    }

    // Tryb standardowy (pełny widok)
    if (currentLineup) {
      const isIncomplete = currentLineup.player2_id == null || currentLineup.player3_id == null
      return (
        <div className="flex flex-col gap-1">
          {currentLineup.is_iron && !isIncomplete && (
            <span className="text-xs text-gray-500">⚙ auto-wypełniona</span>
          )}
          {currentLineup.is_iron && isIncomplete && (
            <span className="text-xs text-red-400">⚙ auto, niekompletna</span>
          )}
          {([currentLineup.player1_id, currentLineup.player2_id, currentLineup.player3_id] as (string | null)[]).map((pid, i) => (
            <p key={i} className={`text-xs ${pid ? 'text-gray-300' : 'text-gray-500'}`}>
              {i + 1}. {pid ? playerLabel(pid) : '—'}
            </p>
          ))}
          {canEdit && (
            <button
              onClick={handleEdit}
              className="text-xs text-blue-400 hover:text-blue-300 self-start mt-1 inline-flex items-center gap-1"
            >
              <PencilIcon className="h-3 w-3" /> Edytuj trójkę
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="text-xs">
        {canEdit ? (
          <button onClick={handleEdit} className="text-blue-400 hover:text-blue-300">
            Wybierz trójkę
          </button>
        ) : (
          <span className="text-gray-500">Brak trójki</span>
        )}
      </div>
    )
  }

  const selects = [
    { label: '1.', val: p1, set: setP1 },
    { label: '2.', val: p2, set: setP2 },
    { label: '3.', val: p3, set: setP3 },
  ]

  return (
    <form onSubmit={handleSave} className={`flex flex-col gap-2 mt-1${compact ? ' w-full' : ''}`}>
      {selects.map(({ label, val, set }, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-4 shrink-0">{label}</span>
          <select
            value={val}
            onChange={e => set(e.target.value)}
            disabled={isPending}
            required
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white flex-1 disabled:opacity-50"
          >
            <option value="">— wybierz zawodnika —</option>
            {rosterPlayers.map(p => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.league}) — {p.position}
              </option>
            ))}
          </select>
        </div>
      ))}
      {clientValidationError && (
        <p className="text-xs text-orange-400">{clientValidationError}</p>
      )}
      <div className="flex gap-2 items-center">
        <Button type="submit" disabled={isPending || !!clientValidationError} variant="primary" size="sm">
          {isPending ? 'Zapisuję…' : 'Zapisz trójkę'}
        </Button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
        >
          Anuluj
        </button>
      </div>
      {serverError && <p className="text-xs text-red-400">{serverError}</p>}
    </form>
  )
}
