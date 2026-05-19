'use client'

import { useState, useTransition } from 'react'
import { updateLeague } from './actions'

type Props = {
  leagueId: string
  initialValues: {
    name: string
    description: string | null
    season_name: string | null
    max_teams: number
    is_public: boolean
  }
  activeCount: number  // do podpowiedzi w UI przy max_teams
}

export default function EditLeagueForm({ leagueId, initialValues, activeCount }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const res = await updateLeague(leagueId, fd)
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
          defaultValue={initialValues.name}
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
          defaultValue={initialValues.description ?? ''}
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
          defaultValue={initialValues.season_name ?? ''}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white disabled:opacity-50"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">
          Limit zespołów{' '}
          <span className="text-xs text-gray-500">
            (obecnie {activeCount} aktywnych — nie możesz ustawić niżej)
          </span>
        </span>
        <input
          name="max_teams"
          type="number"
          required
          min={Math.max(2, activeCount)}
          max={100}
          defaultValue={initialValues.max_teams}
          disabled={pending}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white disabled:opacity-50"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          name="is_public"
          type="checkbox"
          defaultChecked={initialValues.is_public}
          disabled={pending}
          className="w-4 h-4"
        />
        <span className="text-sm">Liga publiczna (każdy może zgłosić chęć dołączenia)</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded px-4 py-2 mt-2"
      >
        {pending ? 'Zapisuję…' : 'Zapisz zmiany'}
      </button>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </form>
  )
}