import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../utils/supabase/server'
import CreateLeagueForm from './create-league-form'

export default async function NewLeaguePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[500px]">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-white mb-4 inline-block"
        >
          ← Wróć na stronę główną
        </Link>

        <h1 className="text-2xl font-bold mb-6">Stwórz nową ligę</h1>

        <div className="bg-gray-800 rounded-lg p-6">
          <CreateLeagueForm />
        </div>
      </div>
    </div>
  )
}