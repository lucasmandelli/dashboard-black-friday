// Aceita a Project URL mesmo se colada com caminho extra (ex.: ".../rest/v1/"):
// o supabase-js acrescenta /rest/v1 e /auth/v1 sozinho.
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim()
  try {
    return new URL(trimmed).origin
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}
