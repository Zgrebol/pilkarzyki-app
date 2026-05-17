'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../utils/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Hasło musi mieć co najmniej 8 znaków')
      return
    }

    if (password !== confirmPassword) {
      setError('Hasła nie są zgodne')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(true)
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="password">Hasło (min. 8 znaków)</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="confirmPassword">Potwierdź hasło</label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 mt-2"
            >
              {loading ? 'Rejestracja...' : 'Zarejestruj się'}
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
