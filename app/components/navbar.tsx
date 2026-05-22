// components/navbar.tsx
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { signOut } from '@/app/auth/actions'

export default async function Navbar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let label: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
    label = profile?.display_name ?? user.email?.split('@')[0] ?? 'Profil'
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-white hover:text-gray-300">
          ⚽ Piłkarzyki
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/profile" className="rounded border border-gray-600 px-2 py-0.5 text-gray-300 hover:border-gray-400 hover:text-white">
                {label}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded border border-red-700 px-3 py-1 text-red-400 hover:bg-red-900/30 hover:text-red-300"
                >
                  Wyloguj
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-300 hover:text-white">
                Zaloguj
              </Link>
              <Link
                href="/signup"
                className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500"
              >
                Rejestracja
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}