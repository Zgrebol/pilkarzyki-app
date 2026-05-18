'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../../utils/supabase/server'

export async function createLeague(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const isPublic = formData.get('is_public') === 'on'
  const maxTeams = Number(formData.get('max_teams') ?? 16)
  const seasonName = String(formData.get('season_name') ?? '').trim()

  if (name.length < 3 || name.length > 50) {
    return { error: 'Nazwa ligi musi mieć od 3 do 50 znaków' }
  }
  if (maxTeams < 2 || maxTeams > 100) {
    return { error: 'Limit zespołów: od 2 do 100' }
  }
  if (seasonName.length === 0) {
    return { error: 'Podaj nazwę sezonu (np. "2025/26")' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Brak sesji — zaloguj się ponownie' }
  }

  const { data, error } = await supabase
    .from('leagues')
    .insert({
      name,
      description: description || null,
      is_public: isPublic,
      max_teams: maxTeams,
      season_name: seasonName,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  redirect(`/leagues/${data.id}`)
}