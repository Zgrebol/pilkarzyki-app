'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setManualPosition } from '../table-actions'
import { Button } from '@/app/components/ui/button'
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

type Props = {
  participantId: string
  currentOverride: number | null
  totalParticipants: number
}

export default function ManualPositionEditor({ participantId, currentOverride, totalParticipants }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const pos = parseInt(value, 10)
    if (!Number.isInteger(pos) || pos < 1 || pos > totalParticipants) {
      setError(`Pozycja: 1–${totalParticipants}`)
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await setManualPosition(participantId, pos)
      if ('error' in res) {
        setError(res.error)
      } else {
        setEditing(false)
        setValue('')
        router.refresh()
      }
    })
  }

  function handleClear() {
    setError(null)
    startTransition(async () => {
      const res = await setManualPosition(participantId, null)
      if ('error' in res) {
        setError(res.error)
      } else {
        setEditing(false)
        setValue('')
        router.refresh()
      }
    })
  }

  if (!editing) {
    return (
      <Button
        onClick={() => { setEditing(true); setValue('') }}
        variant="ghost"
        size="sm"
        title="Nadpisz pozycję ręcznie"
      >
        <PencilIcon className="h-3 w-3" />
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1 flex-wrap justify-end">
      <span className="text-xs text-gray-400">Poz:</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ''))}
        disabled={isPending}
        placeholder="1"
        className="w-12 text-center bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
      />
      <Button onClick={handleSave} variant="default" size="sm" disabled={isPending || !value}>
        <CheckIcon className="h-3 w-3" />
        Zapisz
      </Button>
      {currentOverride != null && (
        <Button onClick={handleClear} variant="ghost" size="sm" disabled={isPending}>
          <XMarkIcon className="h-3 w-3" />
          Wyczyść
        </Button>
      )}
      <Button onClick={() => { setEditing(false); setError(null) }} variant="ghost" size="sm" disabled={isPending}>
        Anuluj
      </Button>
      {error && <span className="text-xs text-red-400 w-full text-right">{error}</span>}
    </div>
  )
}
