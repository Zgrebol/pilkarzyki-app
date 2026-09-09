'use client'

import { useState, useTransition } from 'react'
import { setDraftPosition } from './table-actions'
import { Button } from '@/app/components/ui/button'
import { CheckIcon } from '@heroicons/react/24/outline'

type Props = {
  participantId: string
  currentDraftPosition: number | null
}

export default function DraftPositionEditor({ participantId, currentDraftPosition }: Props) {
  const [value, setValue] = useState(currentDraftPosition?.toString() ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const pos = value === '' ? null : parseInt(value, 10)
    if (value !== '' && (!Number.isInteger(pos) || (pos as number) < 1)) {
      setError('Podaj poprawną liczbę')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await setDraftPosition(participantId, pos)
      if ('error' in res) {
        setError(res.error)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-xs text-gray-500">Poz. draftu:</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={e => { setValue(e.target.value.replace(/[^0-9]/g, '')); setSaved(false) }}
        disabled={isPending}
        placeholder="–"
        className="w-12 text-center bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-xs text-white disabled:opacity-50"
      />
      <Button onClick={handleSave} variant="ghost" size="sm" disabled={isPending}>
        <CheckIcon className="h-3 w-3" />
      </Button>
      {saved && <span className="text-xs text-green-400">Zapisano</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
