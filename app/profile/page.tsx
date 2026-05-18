import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'
import ProfileForm from './profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, is_super_admin')
    .eq('id', user.id)
    .single()

  async function handleSignOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  const shortId = user.id.substring(0, 8)
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString('pl-PL')
    : '—'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px]">
        <Link
  href="/"
  className="text-sm text-gray-400 hover:text-white mb-4 inline-block"
>
  ← Wróć na stronę główną
</Link>
<h1 className="text-2xl font-bold mb-6 text-center">Profil</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 flex flex-col gap-3">
          <p>
            <span className="text-gray-400">Email: </span>
            {user.email}
          </p>
          <p>
            <span className="text-gray-400">ID: </span>
            {shortId}...
          </p>
          <p>
            <span className="text-gray-400">Data rejestracji: </span>
            {createdAt}
          </p>
          {profile?.is_super_admin && (
            <p className="text-yellow-400">🛡️ Super admin</p>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <ProfileForm initial={profile?.display_name ?? ''} />
        </div>

        <form action={handleSignOut}>
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2"
          >
            Wyloguj
          </button>
        </form>
      </div>
    </div>
  )
}