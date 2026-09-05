'use client'

import { useState, useTransition } from 'react'
import { updateMatchday } from './matchday-actions'
import { Button } from '@/app/components/ui/Button'

type Matchday = {
  id: string
  number: number
  date_from: string | null
  date_to: string | null
  deadline: string | null
}

type Props = {
  matchday: Matchday
  canEdit: boolean
}

function formatDateRange(dateFrom: string | null, dateTo: string | null): string {
  if (!dateFrom && !dateTo) return 'Termin nieustalony'
  if (dateFrom && !dateTo) {
    return new Date(dateFrom).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (!dateFrom && dateTo) {
    return `do ${new Date(dateTo).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  const from = new Date(dateFrom!)
  const to = new Date(dateTo!)
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    const monthYear = to.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
    return `${from.getDate()}–${to.getDate()} ${monthYear}`
  }
  const fromStr = from.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
  const toStr = to.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fromStr} – ${toStr}`
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 16)
}

export default function MatchdayEditor({ matchday, canEdit }: Props) {
  const [editing, setEditing] = useState(false)
  const [dateFrom, setDateFrom] = useState(matchday.date_from ?? '')
  const [dateTo, setDateTo] = useState(matchday.date_to ?? '')
  const [deadline, setDeadline] = useState(toDatetimeLocal(matchday.deadline))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await updateMatchday(matchday.id, {
        date_from: dateFrom || null,
        date_to: dateTo || null,
        deadline: deadline ? `${deadline}:00+00:00` : null,
      })
      if (res?.error) {
        setError(res.error)
      } else {
        setEditing(false)
      }
    })
  }

  function handleCancel() {
    setDateFrom(matchday.date_from ?? '')
    setDateTo(matchday.date_to ?? '')
    setDeadline(toDatetimeLocal(matchday.deadline))
    setError(null)
    setEditing(false)
  }

  const deadlineDisplay = matchday.deadline
    ? new Date(matchday.deadline).toLocaleString('pl-PL', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="px-5 py-3">
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium text-sm">Kolejka {matchday.number}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDateRange(matchday.date_from, matchday.date_to)}
          </p>
          {deadlineDisplay && (
            <p className="text-xs text-gray-500">Deadline: {deadlineDisplay}</p>
          )}
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-400 hover:text-blue-300 shrink-0"
          >
            Edytuj
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={handleSave} className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-32">
              <label className="text-xs text-gray-500">Od</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                disabled={isPending}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-32">
              <label className="text-xs text-gray-500">Do</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                disabled={isPending}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Deadline (UTC, opcjonalny)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              disabled={isPending}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white disabled:opacity-50 w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} variant="primary" size="sm">
              {isPending ? 'Zapisuję…' : 'Zapisz'}
            </Button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
            >
              Anuluj
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </form>
      )}
    </div>
  )
}
