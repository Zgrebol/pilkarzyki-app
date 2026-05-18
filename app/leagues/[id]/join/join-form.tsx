'use client'

import { useState, useTransition } from 'react'
import { joinLeague } from './actions'

type Props = {
  leagueId: string
  leagueName: string
}

export default function JoinForm({ leagueId, leagueName }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const res = await joinLeague(leagueId, fd)
      // Po sukcesie Server Action robi redirect — kod tu nie wraca.
      // Jeśli wrócił, znaczy że był błąd.
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="bg-gray-900/50 rounded p-4 text-sm text-gray-300">
        Dołączasz do ligi: <span className="font-semibold text-white">{leagueName}</span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Nazwa Twojego zespołu</span>
        <input
          name="team_name"
          required
          minLength={2}
          maxLength={30}
          disabled={pending}
          placeholder="np. FC Pomidory, Real Mufka..."
          autoFocus
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white disabled:opacity-50"
        />
        <span className="text-xs text-gray-500">
          2-30 znaków. Nazwa musi być unikalna w tej lidze.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded px-4 py-2"
      >
        {pending ? 'Wysyłam zgłoszenie…' : 'Zgłoś chęć dołączenia'}
      </button>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <p className="text-xs text-gray-500 text-center">
        Po zgłoszeniu moderator ligi musi je zaakceptować, zanim staniesz się pełnoprawnym członkiem.
      </p>
    </form>
  )
}