import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../utils/supabase/server'

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function SignupPage({ searchParams }: Props) {
  const { error, success } = await searchParams

  async function handleSignup(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password.length < 8) {
      redirect('/signup?error=' + encodeURIComponent('Hasło musi mieć co najmniej 8 znaków'))
    }

    if (password !== confirmPassword) {
      redirect('/signup?error=' + encodeURIComponent('Hasła nie są zgodne'))
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      },
    })

    if (error) {
      redirect('/signup?error=' + encodeURIComponent(error.message))
    }

    redirect('/signup?success=1')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <h1 className="text-2xl font-bold mb-6 text-center">Rejestracja</h1>
        {success ? (
          <p className="text-green-400 text-center text-lg">
            Sprawdź email i kliknij link aktywacyjny
          </p>
        ) : (
          <form action={handleSignup} className="flex flex-col gap-4">
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
              <label htmlFor="password">Hasło (min. 8 znaków)</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="confirmPassword">Potwierdź hasło</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
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
              Zarejestruj się
            </button>
          </form>
        )}
        <p className="text-center mt-4 text-gray-400">
          Masz już konto?{' '}
          <Link href="/login" className="text-blue-400 hover:underline">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  )
}
