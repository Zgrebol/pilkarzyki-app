'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteLeague } from './league-actions'
import { Button } from '@/app/components/ui/Button'
import { TrashIcon } from '@heroicons/react/24/outline'

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
        router.push('/')
      }
    })
  }

  return (
    <Button onClick={handleDelete} disabled={isPending} variant="danger" size="sm">
      <TrashIcon className="h-3.5 w-3.5" />
      {isPending ? 'Usuwanie…' : 'Usuń'}
    </Button>
  )
}
