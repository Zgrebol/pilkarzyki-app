'use client'

import { useState, useTransition } from 'react'
import { createOwnTeam } from './team-actions'

export default function CreateTeamButton({ leagueId }: { leagueId: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createOwnTeam(leagueId, name)
      if (res?.error) setError(res.error)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-green-700 hover:bg-green-600 rounded px-3 py-1 text-white"
      >
        + Załóż drużynę
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nazwa drużyny (2–30 znaków)"
          minLength={2}
          maxLength={30}
          required
          disabled={isPending}
          autoFocus
          className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-sm text-white flex-1 min-w-[160px] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending}
          className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded px-3 py-1 text-white"
        >
          {isPending ? 'Tworzę…' : 'Utwórz'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
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
