'use client'

import { useState, useTransition } from 'react'
import { emergencyReopen } from './pairs-actions'

type Props = {
  seasonId: string
  leagueName: string
}

export default function EmergencyReopenButton({ seasonId, leagueName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    const typed = window.prompt(
      `⚠️ AWARYJNE OTWARCIE ZAPISÓW\n\nTa operacja usuwa WSZYSTKIE dane sezonu:\n• uczestników i składy\n• kolejki, pary, trójki meczowe\n\nWpisz nazwę ligi, żeby potwierdzić:\n"${leagueName}"`
    )
    if (!typed) return
    setError(null)
    startTransition(async () => {
      const res = await emergencyReopen(seasonId, typed)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs bg-red-800 hover:bg-red-700 disabled:opacity-50 rounded px-2 py-0.5 text-white"
        title="Kasuje cały sezon i otwiera zapisy od nowa. Tylko super admin."
      >
        🚨 {isPending ? 'Otwieram…' : 'Awaryjne otwarcie'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  )
}
