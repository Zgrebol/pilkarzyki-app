import { createClient } from '../../../../../utils/supabase/server'
import { Card } from '@/app/components/ui/Card'
import { BoltIcon } from '@heroicons/react/24/outline'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ZelazneTrojkiPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('league_id', id)
    .eq('status', 'locked')
    .maybeSingle()

  if (!currentSeason) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <BoltIcon className="h-5 w-5 text-yellow-400" /> Żelazne trójki
        </h2>
        <p className="text-gray-400 text-sm">Statystyki pojawią się po rozpoczęciu sezonu.</p>
      </Card>
    )
  }

  const { data: matchdays } = await supabase
    .from('matchdays')
    .select('id')
    .eq('season_id', currentSeason.id)

  const matchdayIds = (matchdays ?? []).map((m: any) => m.id)

  if (matchdayIds.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <BoltIcon className="h-5 w-5 text-yellow-400" /> Żelazne trójki
        </h2>
        <p className="text-gray-400 text-sm">Brak danych — terminarz nie został wygenerowany.</p>
      </Card>
    )
  }

  const { data: participants } = await supabase
    .from('season_participants')
    .select('id, teams(name, owner_id, profiles(display_name))')
    .eq('season_id', currentSeason.id)

  const participantMap = new Map<string, { teamName: string; ownerName: string }>(
    (participants ?? []).map((p: any) => [
      p.id,
      {
        teamName: p.teams?.name ?? '(brak)',
        ownerName: p.teams?.profiles?.display_name ?? '(brak)',
      },
    ])
  )

  const { data: ironLineups } = await supabase
    .from('matchday_lineups')
    .select('season_participant_id')
    .in('matchday_id', matchdayIds)
    .eq('is_iron', true)

  const countByParticipant = new Map<string, number>()
  for (const lineup of (ironLineups ?? []) as any[]) {
    const prev = countByParticipant.get(lineup.season_participant_id) ?? 0
    countByParticipant.set(lineup.season_participant_id, prev + 1)
  }

  const rows = Array.from(countByParticipant.entries())
    .map(([participantId, count]) => ({
      participantId,
      count,
      teamName: participantMap.get(participantId)?.teamName ?? '(brak)',
      ownerName: participantMap.get(participantId)?.ownerName ?? '(brak)',
    }))
    .sort((a, b) => b.count - a.count || a.teamName.localeCompare(a.teamName))

  if (rows.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <BoltIcon className="h-5 w-5 text-yellow-400" /> Żelazne trójki
        </h2>
        <p className="text-gray-400 text-sm">Nikt jeszcze nie dostał żelaznej trójki w tym sezonie.</p>
      </Card>
    )
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <BoltIcon className="h-5 w-5 text-yellow-400" /> Żelazne trójki
      </h2>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-700/30 text-xs uppercase tracking-wide text-gray-400">
                <th className="text-right px-3 py-2 w-10">#</th>
                <th className="text-left px-3 py-2">Drużyna</th>
                <th className="text-left px-3 py-2">Właściciel</th>
                <th className="text-right px-3 py-2 w-20">Razy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {rows.map((row, i) => (
                <tr key={row.participantId} className="hover:bg-gray-800/30 transition-colors">
                  <td className="text-right px-3 py-2.5 text-gray-400 tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-white">{row.teamName}</td>
                  <td className="px-3 py-2.5 text-gray-400">{row.ownerName}</td>
                  <td className="text-right px-3 py-2.5 font-bold text-yellow-400 tabular-nums">
                    {row.count}×
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}
