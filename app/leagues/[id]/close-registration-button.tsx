'use client'

import { useState, useTransition } from 'react'
import { closeRegistration } from './season-actions'
import { Button } from '@/app/components/ui/Button'
import { LockClosedIcon } from '@heroicons/react/24/outline'

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
      <Button onClick={handleClick} disabled={isPending} variant="secondary" size="sm">
        <LockClosedIcon className="h-3.5 w-3.5" />
        {isPending ? 'Zamykam…' : 'Zamknij zapisy'}
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  )
}
