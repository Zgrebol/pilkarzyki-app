'use client'

import { useState, useTransition } from 'react'
import { approveMember, rejectMember } from './moderation-actions'

type PendingMember = {
  id: string
  team_name: string | null
  joined_at: string
  display_name: string
}

type Props = {
  leagueId: string
  pendingMembers: PendingMember[]
}

export default function PendingMembersPanel({ leagueId, pendingMembers }: Props) {
  // Stan per-wiersz: który member jest właśnie przetwarzany, czy w trakcie + ewentualny błąd
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorByMember, setErrorByMember] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  function handleApprove(memberId: string) {
    setErrorByMember(prev => ({ ...prev, [memberId]: '' }))
    setProcessingId(memberId)

    startTransition(async () => {
      const res = await approveMember(leagueId, memberId)
      setProcessingId(null)
      if (res?.error) {
        setErrorByMember(prev => ({ ...prev, [memberId]: res.error }))
      }
      // Po sukcesie revalidatePath odświeży stronę — wiersz zniknie z listy
    })
  }

  function handleReject(memberId: string, displayName: string) {
    const confirmed = window.confirm(`Odrzucić zgłoszenie od ${displayName}?`)
    if (!confirmed) return

    setErrorByMember(prev => ({ ...prev, [memberId]: '' }))
    setProcessingId(memberId)

    startTransition(async () => {
      const res = await rejectMember(leagueId, memberId)
      setProcessingId(null)
      if (res?.error) {
        setErrorByMember(prev => ({ ...prev, [memberId]: res.error }))
      }
    })
  }

  if (pendingMembers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-gray-400 text-sm">
        Brak oczekujących zgłoszeń.
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
      {pendingMembers.map(member => {
        const isProcessing = processingId === member.id
        const errorMsg = errorByMember[member.id]
        const joinedDate = new Date(member.joined_at).toLocaleDateString('pl-PL')

        return (
          <div key={member.id} className="px-5 py-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{member.display_name}</p>
                {member.team_name && (
                  <p className="text-sm text-gray-400">
                    Zespół: <span className="text-white">{member.team_name}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">Zgłoszono: {joinedDate}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(member.id)}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded px-3 py-2"
                >
                  {isProcessing ? 'Akceptuję…' : '✓ Akceptuj'}
                </button>
                <button
                  onClick={() => handleReject(member.id, member.display_name)}
                  disabled={isProcessing}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded px-3 py-2"
                >
                  ✕ Odrzuć
                </button>
              </div>
            </div>
            {errorMsg && (
              <p className="text-sm text-red-400 mt-2">{errorMsg}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}