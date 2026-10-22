import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Sem as variáveis do Supabase o app roda em modo demonstração, com dados fictícios. */
export const isDemo = !url || !anonKey

export const supabase: SupabaseClient | null = isDemo ? null : createClient(url!, anonKey!)
