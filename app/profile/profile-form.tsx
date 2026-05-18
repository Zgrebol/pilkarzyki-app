'use client'

import { useState, useTransition } from 'react'
import { updateDisplayName } from './actions'

export default function ProfileForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setMsg(null)

    startTransition(async () => {
      const res = await updateDisplayName(fd)
      if (res.error) {
        setMsg({ type: 'error', text: res.error })
      } else {
        setMsg({ type: 'success', text: 'Zapisano ✓' })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Nazwa wyświetlana</span>
        <input
          name="display_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={40}
          required
          disabled={pending}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white disabled:opacity-50"
        />
      </label>
      <button
        type="submit"
        disabled={pending || name.trim().length < 2}
        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded px-4 py-2"
      >
        {pending ? 'Zapisuję…' : 'Zapisz'}
      </button>
      {msg && (
        <p className={`text-sm ${msg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {msg.text}
        </p>
      )}
    </form>
  )
}