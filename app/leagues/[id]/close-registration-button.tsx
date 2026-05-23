'use client'

import { useState, useTransition } from 'react'
import { closeRegistration } from './season-actions'

export default function CloseRegistrationButton({ leagueId }: { leagueId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (!window.confirm('Zamknąć zapisy do sezonu? Gracze nie będą mogli już dołączać do ligi.')) return
    setError(null)
    startTransition(async () => {
      const res = await closeRegistration(leagueId)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 rounded px-2 py-0.5 text-white"
      >
        🔒 {isPending ? 'Zamykam…' : 'Zamknij zapisy'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  )
}
