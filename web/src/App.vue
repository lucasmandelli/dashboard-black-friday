<script setup lang="ts">
import { useRouter } from 'vue-router'
import { isDemo } from './lib/supabase'
import { useAuth } from './stores/auth'
import { useProducts } from './stores/products'

const auth = useAuth()
const products = useProducts()
const router = useRouter()

async function signOut() {
  await auth.signOut()
  products.reset()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen">
    <div v-if="isDemo" class="bg-warn-bg px-4 py-2 text-center text-xs text-warn-ink">
      Modo demonstração: dados fictícios. Configure o Supabase (veja o README) para usar de verdade.
    </div>
    <header class="border-b border-line bg-surface">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <RouterLink to="/" class="flex items-center gap-2 font-semibold">
          <span aria-hidden="true" class="grid size-7 place-items-center rounded-md bg-accent text-sm text-accent-ink">R$</span>
          Radar de Preços
        </RouterLink>
        <div v-if="auth.loggedIn" class="flex items-center gap-3 text-sm">
          <span class="hidden text-ink-2 sm:inline">{{ auth.email }}</span>
          <button v-if="!isDemo" class="btn btn-ghost" @click="signOut">Sair</button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
