'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { restoreLeague } from './league-actions'

export default function RestoreLeagueButton({ leagueId }: { leagueId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRestore() {
    if (!window.confirm('Przywrócić tę ligę? Znów będzie widoczna dla użytkowników.')) return
    startTransition(async () => {
      const res = await restoreLeague(leagueId)
      if (res?.error) {
        alert(`Błąd: ${res.error}`)
      } else {
        router.refresh() // zostajemy na stronie, odświeżamy — banerka zniknie
      }
    })
  }

  return (
    <button
      onClick={handleRestore}
      disabled={isPending}
      className="text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded px-3 py-1"
    >
      {isPending ? 'Przywracanie…' : '♻️ Przywróć'}
    </button>
  )
}