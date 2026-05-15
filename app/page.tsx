import { createClient } from '../utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('leagues').select('*')

  const connected = error?.code !== 'PGRST301' && error?.message !== 'fetch failed'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold mb-4">Piłkarzyki</h1>
      <p className="text-xl text-gray-400 mb-12">Platforma fantasy ligi piłkarskiej</p>

      <div className="mb-4 text-lg">
        <span className="text-gray-300">Status połączenia z bazą: </span>
        {connected ? (
          <span className="text-green-400 font-semibold">✓ Połączono z Supabase</span>
        ) : (
          <span className="text-red-400 font-semibold">✗ Nie udało się połączyć</span>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full text-sm font-mono text-gray-300 whitespace-pre-wrap break-all">
        {JSON.stringify({ data, error }, null, 2)}
      </div>
    </div>
  )
}
