import type { Session } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { isDemo, supabase } from '../lib/supabase'

export const useAuth = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const ready = ref(isDemo)

  const loggedIn = computed(() => isDemo || !!session.value)
  const email = computed(() => (isDemo ? 'demo@exemplo.com' : session.value?.user.email ?? null))

  async function init() {
    if (isDemo || ready.value) return
    const { data } = await supabase!.auth.getSession()
    session.value = data.session
    supabase!.auth.onAuthStateChange((_event, s) => {
      session.value = s
    })
    ready.value = true
  }

  async function sendMagicLink(address: string) {
    const { error } = await supabase!.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (error) throw error
  }

  async function signOut() {
    if (!isDemo) await supabase!.auth.signOut()
  }

  return { session, ready, loggedIn, email, init, sendMagicLink, signOut }
})
