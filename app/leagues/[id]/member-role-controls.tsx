'use client'

import { useState, useTransition } from 'react'
import { changeMemberRole } from './role-actions'

type Props = {
  leagueId: string
  memberId: string
  currentRole: 'player' | 'mod' | 'admin'
  // Czy patrzący jest super adminem (steruje widocznością akcji admina)
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
        {/* player ↔ mod — widoczne dla admina ligi i super admina */}
        {currentRole === 'player' && (
          <button
            onClick={() => run('mod', 'Mianować tego gracza moderatorem ligi?')}
            disabled={isPending}
            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded px-2 py-1"
          >
            Mianuj modem
          </button>
        )}
        {currentRole === 'mod' && (
          <button
            onClick={() => run('player', 'Odebrać temu członkowi rolę moderatora?')}
            disabled={isPending}
            className="text-xs bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded px-2 py-1"
          >
            Odbierz moda
          </button>
        )}

        {/* nadanie/odebranie admina — TYLKO super admin */}
        {viewerIsSuperAdmin && currentRole !== 'admin' && (
          <button
            onClick={() => run('admin', 'Nadać temu członkowi rolę admina ligi? Będzie mógł zarządzać ligą.')}
            disabled={isPending}
            className="text-xs bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded px-2 py-1"
          >
            Ustaw adminem
          </button>
        )}
        {viewerIsSuperAdmin && currentRole === 'admin' && (
          <button
            onClick={() => run('player', 'Odebrać temu członkowi rolę admina ligi?')}
            disabled={isPending}
            className="text-xs bg-red-600/80 hover:bg-red-600 disabled:opacity-50 rounded px-2 py-1"
          >
            Odbierz admina
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400 max-w-[200px] text-right">{error}</p>}
    </div>
  )
}