'use client'

import { useState, useTransition } from 'react'
import { setMatchResults } from '../../results-actions'
import { calcMatchScore } from '@/app/lib/match-score'
import { Button } from '@/app/components/ui/Button'
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

type PlayerInfo = { id: string; full_name: string; participantId: string }

type PairData = {
  pairId: string
  homeParticipantId: string
  homeTeamName: string
  homePlayers: PlayerInfo[]
  awayParticipantId: string
  awayTeamName: string
  awayPlayers: PlayerInfo[]
}

type ExistingResult = {
  roster_player_id: string
  season_participant_id: string
  goals: number
  own_goals: number
  match_finished: boolean
}

type Props = {
  matchdayId: string
  pairs: PairData[]
  existingResults: ExistingResult[]
  canEdit: boolean
}

type PlayerEntry = { goals: number; own_goals: number; match_finished: boolean }

export default function MatchResultsEditor({ matchdayId, pairs, existingResults, canEdit }: Props) {
  const validPairs = pairs.filter(p => p.homePlayers.length === 3 && p.awayPlayers.length === 3)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Map<string, PlayerEntry>>(() => {
    const m = new Map<string, PlayerEntry>()
    for (const r of existingResults) {
      m.set(r.roster_player_id, { goals: r.goals, own_goals: r.own_goals, match_finished: r.match_finished })
    }
    return m
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!canEdit || validPairs.length === 0) return null

  function getEntry(playerId: string): PlayerEntry {
    return form.get(playerId) ?? { goals: 0, own_goals: 0, match_finished: false }
  }

  function setGoal(playerId: string, field: 'goals' | 'own_goals', value: number) {
    setForm(prev => {
      const next = new Map(prev)
      const cur = next.get(playerId) ?? { goals: 0, own_goals: 0, match_finished: false }
      next.set(playerId, { ...cur, [field]: Math.max(0, value) })
      return next
    })
  }

  function setFinished(playerId: string, value: boolean) {
    setForm(prev => {
      const next = new Map(prev)
      const cur = next.get(playerId) ?? { goals: 0, own_goals: 0, match_finished: false }
      next.set(playerId, { ...cur, match_finished: value })
      return next
    })
  }

  function handleSave() {
    setError(null)
    const results: Parameters<typeof setMatchResults>[1] = []
    for (const pair of validPairs) {
      for (const player of [...pair.homePlayers, ...pair.awayPlayers]) {
        const entry = getEntry(player.id)
        results.push({
          roster_player_id: player.id,
          season_participant_id: player.participantId,
          goals: entry.goals,
          own_goals: entry.own_goals,
          match_finished: entry.match_finished,
        })
      }
    }
    startTransition(async () => {
      const res = await setMatchResults(matchdayId, results)
      if ('error' in res) {
        setError(res.error)
      } else {
        setEditing(false)
      }
    })
  }

  if (!editing) {
    return (
      <div className="mt-2">
        <Button onClick={() => setEditing(true)} variant="ghost" size="sm">
          <PencilIcon className="h-3.5 w-3.5 mr-1" />
          Edytuj wyniki
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-3 border border-gray-700 rounded-lg p-4 bg-gray-900/60 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-200">Wpisz wyniki kolejki</span>
        <Button
          onClick={() => { setEditing(false); setError(null) }}
          variant="ghost"
          size="sm"
          disabled={isPending}
        >
          <XMarkIcon className="h-3.5 w-3.5 mr-1" />
          Anuluj
        </Button>
      </div>

      <div className="space-y-3">
        {validPairs.map(pair => {
          const homeEntries = pair.homePlayers.map(p => getEntry(p.id))
          const awayEntries = pair.awayPlayers.map(p => getEntry(p.id))
          const score = calcMatchScore(homeEntries, awayEntries)
          return (
            <div key={pair.pairId} className="border border-gray-700/50 rounded p-3 space-y-2">
              <p className="text-sm font-medium text-white">
                {pair.homeTeamName}
                <span className="text-blue-400 font-bold mx-1.5">[{score.home}]</span>
                <span className="text-gray-500">–</span>
                <span className="text-blue-400 font-bold mx-1.5">[{score.away}]</span>
                {pair.awayTeamName}
              </p>
              <div className="space-y-1">
                {pair.homePlayers.map(player => (
                  <PlayerRow
                    key={player.id}
                    name={player.full_name}
                    entry={getEntry(player.id)}
                    disabled={isPending}
                    onChangeGoal={v => setGoal(player.id, 'goals', v)}
                    onChangeOwnGoal={v => setGoal(player.id, 'own_goals', v)}
                    onChangeFinished={v => setFinished(player.id, v)}
                  />
                ))}
              </div>
              <div className="border-t border-gray-700/30" />
              <div className="space-y-1">
                {pair.awayPlayers.map(player => (
                  <PlayerRow
                    key={player.id}
                    name={player.full_name}
                    entry={getEntry(player.id)}
                    disabled={isPending}
                    onChangeGoal={v => setGoal(player.id, 'goals', v)}
                    onChangeOwnGoal={v => setGoal(player.id, 'own_goals', v)}
                    onChangeFinished={v => setFinished(player.id, v)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button onClick={handleSave} variant="primary" size="sm" disabled={isPending}>
        <CheckIcon className="h-3.5 w-3.5 mr-1" />
        {isPending ? 'Zapisuję…' : 'Zapisz wyniki'}
      </Button>
    </div>
  )
}

function PlayerRow({
  name,
  entry,
  disabled,
  onChangeGoal,
  onChangeOwnGoal,
  onChangeFinished,
}: {
  name: string
  entry: PlayerEntry
  disabled: boolean
  onChangeGoal: (value: number) => void
  onChangeOwnGoal: (value: number) => void
  onChangeFinished: (value: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs text-gray-300 w-36 truncate">{name}</span>
      <label className="flex items-center gap-1 text-xs text-gray-500">
        g:
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={entry.goals}
          disabled={disabled}
          onChange={e => onChangeGoal(parseInt(e.target.value, 10) || 0)}
          className="w-10 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-xs text-white text-center disabled:opacity-50"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-gray-500">
        og:
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={entry.own_goals}
          disabled={disabled}
          onChange={e => onChangeOwnGoal(parseInt(e.target.value, 10) || 0)}
          className="w-10 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-xs text-white text-center disabled:opacity-50"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={entry.match_finished}
          disabled={disabled}
          onChange={e => onChangeFinished(e.target.checked)}
          className="w-3.5 h-3.5 rounded accent-gray-400 disabled:opacity-50"
        />
        mz
      </label>
    </div>
  )
}
