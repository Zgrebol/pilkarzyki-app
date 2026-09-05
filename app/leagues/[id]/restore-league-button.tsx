'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { restoreLeague } from './league-actions'
import { Button } from '@/app/components/ui/Button'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

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
        router.refresh()
      }
    })
  }

  return (
    <Button onClick={handleRestore} disabled={isPending} variant="secondary" size="sm">
      <ArrowPathIcon className="h-3.5 w-3.5" />
      {isPending ? 'Przywracanie…' : 'Przywróć'}
    </Button>
  )
}
