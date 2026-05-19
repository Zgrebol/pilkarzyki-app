'use client'

import { useTransition, useState } from 'react'
import { leaveLeague } from './leave-league-actions'

type Props = {
  leagueId: string
  mode: 'active' | 'pending'
}

export default function LeaveLeagueButton({ leagueId, mode }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isActive = mode === 'active'
  const label = isActive ? 'Wyjdź z ligi' : 'Anuluj zgłoszenie'
  const confirmText = isActive
    ? 'Czy na pewno chcesz opuścić tę ligę? Tej decyzji nie można cofnąć — żeby wrócić, admin musi cię zaprosić ponownie.'
    : 'Czy na pewno chcesz wycofać swoje zgłoszenie? Możesz potem zgłosić się ponownie.'

  function handleClick() {
    if (!window.confirm(confirmText)) return
    setError(null)
    startTransition(async () => {
      const res = await leaveLeague(leagueId)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`text-sm rounded px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          isActive 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-gray-600 hover:bg-gray-700 text-white'
        }`}
      >
        {isPending ? '…' : label}
      </button>
      {error && (
        <p className="text-sm text-red-400 mt-2">{error}</p>
      )}
    </div>
  )
}