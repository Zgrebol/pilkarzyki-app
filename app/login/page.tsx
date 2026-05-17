import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../utils/supabase/server'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  async function handleLogin(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      redirect('/login?error=' + encodeURIComponent('Nieprawidłowy email lub hasło'))
    }

    redirect('/profile')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <h1 className="text-2xl font-bold mb-6 text-center">Logowanie</h1>
        <form action={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password">Hasło</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm">{decodeURIComponent(error)}</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 mt-2"
          >
            Zaloguj się
          </button>
        </form>
        <p className="text-center mt-4 text-gray-400">
          Nie masz konta?{' '}
          <Link href="/signup" className="text-blue-400 hover:underline">
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  )
}
