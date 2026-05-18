'use client'

import { useState, useTransition } from 'react'
import { createLeague } from './actions'

export default function CreateLeagueForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const res = await createLeague(fd)
      // Jeśli akcja zwróciła błąd — pokazujemy. Jeśli redirect — kod tu już nie wraca.
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Nazwa ligi</span>
        <input
          name="name"
          required
          minLength={3}
          maxLength={50}
          disabled={pending}
          placeholder="np. Liga Mistrzów Piłkarzyków"
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white disabled:opacity-50"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Opis (opcjonalny)</span>
        <textarea
          name="description"
          maxLength={500}
          disabled={pending}
          rows={3}
          placeholder="Krótki opis ligi, regulamin, klimat..."
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white disabled:opacity-50 resize-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Nazwa sezonu</span>
        <input
          name="season_name"
          required
          maxLength={30}
          disabled={pending}
          placeholder="np. 2025/26"
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white disabled:opacity-50"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Limit zespołów</span>
        <input
          name="max_teams"
          type="number"
          required
          min={2}
          max={100}
          defaultValue={16}
          disabled={pending}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white disabled:opacity-50"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          name="is_public"
          type="checkbox"
          defaultChecked
          disabled={pending}
          className="w-4 h-4"
        />
        <span className="text-sm">Liga publiczna (każdy może zgłosić chęć dołączenia)</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded px-4 py-2 mt-2"
      >
        {pending ? 'Tworzę ligę…' : 'Stwórz ligę'}
      </button>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </form>
  )
}