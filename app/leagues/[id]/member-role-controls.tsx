'use client'

import { useState, useTransition } from 'react'
import { changeMemberRole } from './role-actions'
import { Button } from '@/app/components/ui/Button'

type Props = {
  leagueId: string
  memberId: string
  currentRole: 'player' | 'mod' | 'admin'
  viewerIsSuperAdmin: boolean
}

export default function MemberRoleControls({
  leagueId,
  memberId,
  currentRole,
  viewerIsSuperAdmin,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(newRole: 'player' | 'mod' | 'admin', confirmMsg: string) {
    if (!window.confirm(confirmMsg)) return
    setError(null)
    startTransition(async () => {
      const res = await changeMemberRole(leagueId, memberId, newRole)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {currentRole === 'player' && (
          <Button
            onClick={() => run('mod', 'Mianować tego gracza moderatorem ligi?')}
            disabled={isPending}
            variant="primary"
            size="sm"
          >
            Mianuj modem
          </Button>
        )}
        {currentRole === 'mod' && (
          <Button
            onClick={() => run('player', 'Odebrać temu członkowi rolę moderatora?')}
            disabled={isPending}
            variant="secondary"
            size="sm"
          >
            Odbierz moda
          </Button>
        )}

        {viewerIsSuperAdmin && currentRole !== 'admin' && (
          <Button
            onClick={() => run('admin', 'Nadać temu członkowi rolę admina ligi? Będzie mógł zarządzać ligą.')}
            disabled={isPending}
            variant="secondary"
            size="sm"
            className="bg-yellow-700 hover:bg-yellow-600 border-transparent"
          >
            Ustaw adminem
          </Button>
        )}
        {viewerIsSuperAdmin && currentRole === 'admin' && (
          <Button
            onClick={() => run('player', 'Odebrać temu członkowi rolę admina ligi?')}
            disabled={isPending}
            variant="danger"
            size="sm"
          >
            Odbierz admina
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-red-400 max-w-[200px] text-right">{error}</p>}
    </div>
  )
}
