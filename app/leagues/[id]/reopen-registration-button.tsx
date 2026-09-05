'use client'

import { useState, useTransition } from 'react'
import { reopenRegistration } from './season-actions'
import { Button } from '@/app/components/ui/Button'
import { LockOpenIcon } from '@heroicons/react/24/outline'

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
      <Button onClick={handleClick} disabled={isPending} variant="secondary" size="sm">
        <LockOpenIcon className="h-3.5 w-3.5" />
        {isPending ? 'Otwieram…' : 'Otwórz zapisy'}
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  )
}
