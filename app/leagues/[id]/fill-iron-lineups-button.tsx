'use client'

import { useState, useTransition } from 'react'
import { fillIronLineups } from './lineup-actions'
import { Button } from '@/app/components/ui/Button'
import { BoltIcon } from '@heroicons/react/24/outline'

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
        const incomplete = (res as any).incomplete ?? 0
        if (incomplete > 0) {
          setMessage(
            `Wpisano ${filled} trójek, w tym ${incomplete} niekompletnych. Skontroluj drużyny z niekompletnymi trójkami.`
          )
        } else {
          setMessage(`Uzupełniono ${filled} żelaznych trójek`)
        }
      }
    })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button onClick={handleClick} disabled={isPending} variant="secondary" size="sm">
        <BoltIcon className="h-3.5 w-3.5" />
        {isPending ? 'Uzupełniam…' : 'Uzupełnij żelazne trójki'}
      </Button>
      {message && <span className="text-xs text-green-400">{message}</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
