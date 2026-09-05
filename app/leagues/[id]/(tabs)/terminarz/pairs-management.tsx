'use client'

import { useState, useTransition } from 'react'
import { generatePairs, regeneratePairs, setParticipantTier } from '../../pairs-actions'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { Card } from '@/app/components/ui/Card'
import { BoltIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline'

type Participant = {
  id: string
  tier: number
  teamName: string
}

type Props = {
  seasonId: string
  participants: Participant[]
  hasPairs: boolean
  canGenerate: boolean
  isSuperAdmin: boolean
  leagueName: string
}

export default function PairsManagement({
  seasonId,
  participants,
  hasPairs,
  canGenerate,
  isSuperAdmin,
  leagueName,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingTierId, setPendingTierId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  function handleGenerate() {
    if (!window.confirm('Wygenerować pary meczowe? Ta operacja przypisze mecze do kolejek na cały sezon.')) return
    setMessage(null)
    startTransition(async () => {
      const res = await generatePairs(seasonId)
      if ('error' in res) {
        setMessage({ text: res.error ?? 'Błąd', type: 'error' })
      } else {
        setMessage({ text: `Wygenerowano ${res.pairs} par i ${res.byes} pauz.`, type: 'success' })
      }
    })
  }

  function handleRegenerate() {
    const typed = window.prompt(
      `Regeneracja par usunie wszystkie istniejące mecze i wygeneruje nowe.\n\nWpisz nazwę ligi, żeby potwierdzić:\n"${leagueName}"`
    )
    if (!typed) return
    setMessage(null)
    startTransition(async () => {
      const res = await regeneratePairs(seasonId, typed)
      if ('error' in res) {
        setMessage({ text: res.error ?? 'Błąd', type: 'error' })
      } else {
        setMessage({ text: `Zregenerowano: ${res.pairs} par i ${res.byes} pauz.`, type: 'success' })
      }
    })
  }

  function handleTierChange(participantId: string, currentTier: number) {
    const newTier = currentTier === 1 ? 2 : 1
    setPendingTierId(participantId)
    setMessage(null)
    startTransition(async () => {
      const res = await setParticipantTier(participantId, newTier as 1 | 2)
      setPendingTierId(null)
      if (res?.error) setMessage({ text: res.error, type: 'error' })
    })
  }

  const tier1 = participants.filter(p => p.tier === 1)
  const tier2 = participants.filter(p => p.tier === 2)

  return (
    <Card className="p-5 mb-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="text-base font-semibold">Pary meczowe</h3>
        <Badge variant={hasPairs ? 'pairs-ok' : 'neutral'}>
          {hasPairs && <CheckIcon className="h-3 w-3" />}
          {hasPairs ? 'Wygenerowane' : 'Nie wygenerowane'}
        </Badge>
      </div>

      {/* Podział na poziomy — tylko gdy brak par i użytkownik może generować */}
      {!hasPairs && canGenerate && participants.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">
            Przypisz drużyny do poziomów przed generowaniem. Wszyscy startują na poziomie 1.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map(tier => {
              const tierList = tier === 1 ? tier1 : tier2
              return (
                <div key={tier} className="bg-gray-900 rounded p-3">
                  <p className="text-xs font-medium text-gray-300 mb-2">
                    Poziom {tier}{' '}
                    <span className="text-gray-500">({tierList.length})</span>
                    {tierList.length === 1 && (
                      <span className="text-yellow-500 ml-1">— za mało (min. 2)</span>
                    )}
                  </p>
                  {tierList.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">Brak drużyn</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {tierList.map(p => (
                        <li key={p.id} className="flex justify-between items-center">
                          <span className="text-xs text-gray-200">{p.teamName}</span>
                          <button
                            onClick={() => handleTierChange(p.id, p.tier)}
                            disabled={isPending && pendingTierId === p.id}
                            className="text-xs text-gray-500 hover:text-blue-400 disabled:opacity-40 ml-2 shrink-0"
                            title={`Przenieś do poziomu ${tier === 1 ? 2 : 1}`}
                          >
                            {isPending && pendingTierId === p.id ? '…' : `→ P${tier === 1 ? 2 : 1}`}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Podgląd podziału gdy pary już istnieją */}
      {hasPairs && participants.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[1, 2].map(tier => {
            const tierList = tier === 1 ? tier1 : tier2
            if (tierList.length === 0) return null
            return (
              <div key={tier} className="bg-gray-900 rounded p-3">
                <p className="text-xs font-medium text-gray-400 mb-1">Poziom {tier} ({tierList.length})</p>
                <ul className="space-y-0.5">
                  {tierList.map(p => (
                    <li key={p.id} className="text-xs text-gray-300">{p.teamName}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {message && (
        <p className={`text-xs mb-3 ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message.text}
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        {!hasPairs && canGenerate && (
          <Button onClick={handleGenerate} disabled={isPending} variant="primary" size="sm">
            <BoltIcon className="h-3.5 w-3.5" />
            {isPending ? 'Generuję…' : 'Generuj pary'}
          </Button>
        )}
        {hasPairs && isSuperAdmin && (
          <Button onClick={handleRegenerate} disabled={isPending} variant="secondary" size="sm" className="bg-yellow-700 hover:bg-yellow-600 border-transparent">
            <ArrowPathIcon className="h-3.5 w-3.5" />
            {isPending ? 'Regeneruję…' : 'Regeneruj pary'}
          </Button>
        )}
      </div>
    </Card>
  )
}
