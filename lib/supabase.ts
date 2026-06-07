import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = () => {
  return supabaseUrl !== '' && supabaseAnonKey !== ''
}

export const getSupabase = () => {
  if (!isSupabaseConfigured()) return null
  return createClient(supabaseUrl, supabaseAnonKey)
}

export const onAuthStateChange = (callback: (session: any) => void) => {
  const supabase = getSupabase()
  if (!supabase) return () => {}
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  
  return () => subscription.unsubscribe()
}

export const fetchAllData = async (userId: string) => {
  const supabase = getSupabase()
  if (!supabase) return {}
  const { data } = await supabase.from('routines').select('data').eq('user_id', userId).single()
  return data?.data || {}
}

export const upsertData = async (userId: string, key: string, value: any) => {
  const supabase = getSupabase()
  if (!supabase) return
  const current = await fetchAllData(userId)
  const newData = { ...current, [key]: value }
  await supabase.from('routines').upsert({ user_id: userId, data: newData }, { onConflict: 'user_id' })
}