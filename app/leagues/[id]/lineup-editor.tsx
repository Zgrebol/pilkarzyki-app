'use client'

import { useState, useTransition } from 'react'
import { setLineup } from './lineup-actions'

type RosterPlayer = {
  id: string
  full_name: string
  club: string
  position: string
}

type Lineup = {
  player1_id: string
  player2_id: string
  player3_id: string
  is_iron: boolean
}

type Props = {
  matchdayId: string
  seasonParticipantId: string
  currentLineup: Lineup | null
  rosterPlayers: RosterPlayer[]
  canEdit: boolean
}

export default function LineupEditor({
  matchdayId,
  seasonParticipantId,
  currentLineup,
  rosterPlayers,
  canEdit,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [p1, setP1] = useState(currentLineup?.player1_id ?? '')
  const [p2, setP2] = useState(currentLineup?.player2_id ?? '')
  const [p3, setP3] = useState(currentLineup?.player3_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const playerMap = new Map(rosterPlayers.map(p => [p.id, p]))

  function playerLabel(id: string) {
    const p = playerMap.get(id)
    if (!p) return '(nieznany zawodnik)'
    return `${p.full_name} · ${p.position} · ${p.club}`
  }

  function handleEdit() {
    setP1(currentLineup?.player1_id ?? '')
    setP2(currentLineup?.player2_id ?? '')
    setP3(currentLineup?.player3_id ?? '')
    setError(null)
    setEditing(true)
  }

  function handleCancel() {
    setError(null)
    setEditing(false)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!p1 || !p2 || !p3) {
      setError('Wybierz trzech zawodników')
      return
    }
    if (p1 === p2 || p1 === p3 || p2 === p3) {
      setError('Zawodnicy muszą być różni')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await setLineup(matchdayId, seasonParticipantId, p1, p2, p3)
      if (res?.error) {
        setError(res.error)
      } else {
        setEditing(false)
      }
    })
  }

  if (!editing) {
    if (currentLineup) {
      return (
        <div className="flex flex-col gap-1">
          {currentLineup.is_iron && (
            <span className="text-xs text-gray-500">🤖 auto-wypełniona</span>
          )}
          {[currentLineup.player1_id, currentLineup.player2_id, currentLineup.player3_id].map((pid, i) => (
            <p key={pid} className="text-xs text-gray-300">
              {i + 1}. {playerLabel(pid)}
            </p>
          ))}
          {canEdit && (
            <button
              onClick={handleEdit}
              className="text-xs text-blue-400 hover:text-blue-300 self-start mt-1"
            >
              Edytuj trójkę
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
    <form onSubmit={handleSave} className="flex flex-col gap-2 mt-1">
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
                {p.full_name} ({p.position}, {p.club})
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="flex gap-2 items-center">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded px-3 py-1 text-white"
        >
          {isPending ? 'Zapisuję…' : 'Zapisz trójkę'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
        >
          Anuluj
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  )
}
