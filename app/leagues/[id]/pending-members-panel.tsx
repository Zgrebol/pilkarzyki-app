'use client'

import { useState, useTransition } from 'react'
import { approveMember, rejectMember } from './moderation-actions'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

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
      <Card className="p-6 text-gray-400 text-sm">
        Brak oczekujących zgłoszeń.
      </Card>
    )
  }

  return (
    <Card className="divide-y divide-gray-700">
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
                <Button
                  onClick={() => handleApprove(member.id)}
                  disabled={isProcessing}
                  variant="primary"
                  size="md"
                >
                  <CheckIcon className="h-4 w-4" />
                  {isProcessing ? 'Akceptuję…' : 'Akceptuj'}
                </Button>
                <Button
                  onClick={() => handleReject(member.id, member.display_name)}
                  disabled={isProcessing}
                  variant="danger"
                  size="md"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Odrzuć
                </Button>
              </div>
            </div>
            {errorMsg && (
              <p className="text-sm text-red-400 mt-2">{errorMsg}</p>
            )}
          </div>
        )
      })}
    </Card>
  )
}
