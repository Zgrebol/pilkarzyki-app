import { createClient } from '../../../../../utils/supabase/server'
import MemberRoleControls from '../../member-role-controls'
import { Badge } from '@/app/components/ui/Badge'
import { Card } from '@/app/components/ui/Card'
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserIcon,
} from '@heroicons/react/24/outline'

type Props = {
  params: Promise<{ id: string }>
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') return <Badge variant="admin"><ShieldCheckIcon className="h-3 w-3" /> admin</Badge>
  if (role === 'mod') return <Badge variant="mod"><ShieldExclamationIcon className="h-3 w-3" /> mod</Badge>
  return <Badge variant="player"><UserIcon className="h-3 w-3" /> gracz</Badge>
}

export default async function CzlonkowiePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isSuperAdmin = false
  let myMembership: { role: string; status: string } | null = null

  if (user) {
    const [profileRes, memberRes] = await Promise.all([
      supabase.from('profiles').select('is_super_admin').eq('id', user.id).single(),
      supabase.from('league_members').select('role, status').eq('league_id', id).eq('user_id', user.id).maybeSingle(),
    ])
    isSuperAdmin = profileRes.data?.is_super_admin ?? false
    myMembership = memberRes.data
  }

  const iAmLeagueAdmin = myMembership?.status === 'active' && myMembership.role === 'admin'
  const canManageRoles = iAmLeagueAdmin || isSuperAdmin

  const { data: members } = await supabase
    .from('league_members')
    .select('id, user_id, role, status, joined_at, profiles(display_name)')
    .eq('league_id', id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })

  const { data: teamsData } = await supabase
    .from('teams')
    .select('owner_id, name')
    .eq('league_id', id)

  const teamByOwner = new Map<string, string>(
    (teamsData ?? []).map((t: any) => [t.owner_id, t.name])
  )

  const memberCount = members?.length ?? 0

  return (
    <>
      <section>
        <h2 className="text-xl font-semibold mb-4">Członkowie ({memberCount})</h2>
        {memberCount === 0 ? (
          <Card className="p-6 text-gray-400 text-sm">
            W lidze nie ma jeszcze żadnych aktywnych członków.
          </Card>
        ) : (
          <Card className="divide-y divide-gray-700">
            {members!.map((member: any) => {
              const name = member.profiles?.display_name ?? '(usunięty profil)'
              const teamName = teamByOwner.get(member.user_id)
              const isMe = member.user_id === user?.id
              const showControls = canManageRoles && !isMe
              return (
                <div key={member.id} className="flex justify-between items-center px-5 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {name}
                      {isMe && <span className="text-xs text-gray-500"> (Ty)</span>}
                    </p>
                    {teamName
                      ? <p className="text-sm text-gray-400">Zespół: {teamName}</p>
                      : <p className="text-sm text-gray-500 italic">Brak drużyny</p>
                    }
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <RoleBadge role={member.role} />
                    {showControls && (
                      <MemberRoleControls
                        leagueId={id}
                        memberId={member.id}
                        currentRole={member.role}
                        viewerIsSuperAdmin={isSuperAdmin}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </section>

    </>
  )
}
