'use client'

import { useState, useTransition } from 'react'
import { reopenRegistration } from './season-actions'

export default function ReopenRegistrationButton({ leagueId }: { leagueId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (!window.confirm('Ponownie otworzyć zapisy do sezonu?')) return
    setError(null)
    startTransition(async () => {
      const res = await reopenRegistration(leagueId)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded px-2 py-0.5 text-white"
      >
        🔓 {isPending ? 'Otwieram…' : 'Otwórz zapisy'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  )
}
