'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteLeague } from './league-actions'

export default function DeleteLeagueButton({
  leagueId,
  leagueName,
}: {
  leagueId: string
  leagueName: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    const confirmed = window.confirm(
      `Usunąć ligę „${leagueName}"?\n\nLiga zniknie dla wszystkich użytkowników. Jako super admin będziesz mógł ją przywrócić.`
    )
    if (!confirmed) return

    startTransition(async () => {
      const res = await deleteLeague(leagueId)
      if (res?.error) {
        alert(`Błąd: ${res.error}`)
      } else {
        router.push('/') // po usunięciu wracamy na home — strona ligi dałaby 404
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs bg-red-600/80 hover:bg-red-600 disabled:opacity-50 rounded px-3 py-1"
    >
      🗑️ {isPending ? 'Usuwanie…' : 'Usuń'}
    </button>
  )
}