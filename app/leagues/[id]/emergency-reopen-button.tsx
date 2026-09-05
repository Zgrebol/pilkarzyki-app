'use client'

import { useState, useTransition } from 'react'
import { emergencyReopen } from './pairs-actions'
import { Button } from '@/app/components/ui/Button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

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
      <Button onClick={handleClick} disabled={isPending} variant="danger" size="sm">
        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
        {isPending ? 'Otwieram…' : 'Awaryjne otwarcie'}
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  )
}
