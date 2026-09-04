'use client'

import { useState, useTransition } from 'react'
import { fillIronLineups } from './lineup-actions'

type Props = {
  seasonId: string
}

export default function FillIronLineupsButton({ seasonId }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm('Uzupełnić żelazne trójki dla wszystkich kolejek po deadline bez ustawionych trójek?')) return
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const res = await fillIronLineups(seasonId)
      if (res?.error) {
        setError(res.error)
      } else {
        const filled = (res as any).filled ?? 0
        setMessage(`Uzupełniono ${filled} żelaznych trójek`)
      }
    })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded px-3 py-1 text-white"
      >
        {isPending ? 'Uzupełniam…' : '⚡ Uzupełnij żelazne trójki'}
      </button>
      {message && <span className="text-xs text-green-400">{message}</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
