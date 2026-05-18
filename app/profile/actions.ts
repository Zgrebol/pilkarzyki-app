'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../utils/supabase/server'

export async function updateDisplayName(formData: FormData) {
  const displayName = String(formData.get('display_name') ?? '').trim()

  if (displayName.length < 2 || displayName.length > 40) {
    return { error: 'Nazwa musi mieć od 2 do 40 znaków' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Brak sesji — zaloguj się ponownie' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/profile')
  return { success: true }
}