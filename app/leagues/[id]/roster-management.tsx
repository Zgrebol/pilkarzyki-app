'use client'

import { useState, useTransition } from 'react'
import { addRosterPlayer, updateRosterPlayer, deleteRosterPlayer } from './roster-actions'

type RosterPlayer = {
  id: string
  full_name: string
  club: string
  position: string
  league: string
}

type PlayerForm = {
  full_name: string
  club: string
  position: string
  league: string
}

type Props = {
  leagueId: string
  seasonParticipantId: string
  players: RosterPlayer[]
}

const emptyForm: PlayerForm = { full_name: '', club: '', position: 'napastnik', league: '' }

export default function RosterManagement({ leagueId: _leagueId, seasonParticipantId, players }: Props) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PlayerForm>(emptyForm)
  const [addForm, setAddForm] = useState<PlayerForm>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const count = players.length

  function startEdit(player: RosterPlayer) {
    setEditingId(player.id)
    setEditForm({ full_name: player.full_name, club: player.club, position: player.position, league: player.league })
    setError(null)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await addRosterPlayer(seasonParticipantId, addForm)
      if (res?.error) {
        setError(res.error)
      } else {
        setAddForm(emptyForm)
      }
    })
  }

  function handleUpdate(e: React.FormEvent, playerId: string) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await updateRosterPlayer(playerId, editForm)
      if (res?.error) {
        setError(res.error)
      } else {
        setEditingId(null)
      }
    })
  }

  function handleDelete(playerId: string, playerName: string) {
    if (!window.confirm(`Usunąć ${playerName} ze składu?`)) return
    setError(null)
    startTransition(async () => {
      const res = await deleteRosterPlayer(playerId)
      if (res?.error) setError(res.error)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-blue-700 hover:bg-blue-600 rounded px-3 py-1 text-white"
      >
        Zarządzaj składem ({count}/9)
      </button>
    )
  }

  return (
    <div className="mt-2 bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-gray-300">Zawodnicy: {count}/9</span>
        <button
          onClick={() => { setOpen(false); setEditingId(null); setError(null) }}
          className="text-xs text-gray-400 hover:text-white"
        >
          Zamknij
        </button>
      </div>

      {players.length > 0 && (
        <div className="mb-4">
          {(['napastnik', 'pomocnik'] as const).map(pos => {
            const group = players.filter(p => p.position === pos)
            if (group.length === 0) return null
            return (
              <div key={pos} className="mb-3">
                <p className="text-xs font-bold text-gray-300 mb-1">
                  {pos === 'napastnik' ? 'Napastnicy:' : 'Pomocnicy:'}
                </p>
                <div className="divide-y divide-gray-700">
                  {group.map(player => (
                    <div key={player.id} className="py-2">
                      {editingId === player.id ? (
                        <form onSubmit={e => handleUpdate(e, player.id)} className="flex flex-col gap-2">
                          <PlayerFormFields form={editForm} onChange={setEditForm} disabled={isPending} formId={player.id} />
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={isPending}
                              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded px-3 py-1 text-white"
                            >
                              {isPending ? 'Zapisuję…' : 'Zapisz'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              disabled={isPending}
                              className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
                            >
                              Anuluj
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm">
                            {player.full_name} ({player.club}, {player.league})
                          </p>
                          <div className="flex gap-3 shrink-0">
                            <button
                              onClick={() => startEdit(player)}
                              disabled={isPending}
                              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                            >
                              Edytuj
                            </button>
                            <button
                              onClick={() => handleDelete(player.id, player.full_name)}
                              disabled={isPending}
                              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                            >
                              Usuń
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {count < 9 ? (
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Dodaj zawodnika</p>
          <form onSubmit={handleAdd} className="flex flex-col gap-2">
            <PlayerFormFields form={addForm} onChange={setAddForm} disabled={isPending} formId="add" />
            <button
              type="submit"
              disabled={isPending}
              className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded px-3 py-1 text-white self-start"
            >
              {isPending ? 'Dodaję…' : 'Dodaj zawodnika'}
            </button>
          </form>
        </div>
      ) : (
        <p className="text-xs text-green-400">✓ Skład kompletny (9/9)</p>
      )}

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  )
}

function PlayerFormFields({
  form,
  onChange,
  disabled,
  formId,
}: {
  form: PlayerForm
  onChange: (form: PlayerForm) => void
  disabled: boolean
  formId: string
}) {
  return (
    <>
      <input
        type="text"
        value={form.full_name}
        onChange={e => onChange({ ...form, full_name: e.target.value })}
        placeholder="Imię i nazwisko"
        maxLength={100}
        required
        disabled={disabled}
        className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm text-white w-full disabled:opacity-50"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={form.club}
          onChange={e => onChange({ ...form, club: e.target.value })}
          placeholder="Klub"
          maxLength={100}
          required
          disabled={disabled}
          className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm text-white flex-1 disabled:opacity-50"
        />
        <input
          type="text"
          value={form.league}
          onChange={e => onChange({ ...form, league: e.target.value })}
          placeholder="Liga (np. Ekstraklasa)"
          maxLength={50}
          required
          disabled={disabled}
          className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm text-white flex-1 disabled:opacity-50"
        />
      </div>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={`position-${formId}`}
            value="napastnik"
            checked={form.position === 'napastnik'}
            onChange={() => onChange({ ...form, position: 'napastnik' })}
            disabled={disabled}
            className="disabled:opacity-50"
          />
          <span className="text-gray-300">Napastnik</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name={`position-${formId}`}
            value="pomocnik"
            checked={form.position === 'pomocnik'}
            onChange={() => onChange({ ...form, position: 'pomocnik' })}
            disabled={disabled}
            className="disabled:opacity-50"
          />
          <span className="text-gray-300">Pomocnik</span>
        </label>
      </div>
    </>
  )
}
