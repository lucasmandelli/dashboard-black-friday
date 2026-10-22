<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../stores/auth'

const auth = useAuth()
const email = ref('')
const status = ref<'idle' | 'sending' | 'sent'>('idle')
const error = ref<string | null>(null)

async function submit() {
  status.value = 'sending'
  error.value = null
  try {
    await auth.sendMagicLink(email.value.trim())
    status.value = 'sent'
  } catch (err) {
    error.value = (err as Error).message
    status.value = 'idle'
  }
}
</script>

<template>
  <div class="mx-auto mt-16 max-w-sm">
    <div class="card p-6">
      <h1 class="text-xl font-semibold">Entrar</h1>
      <p class="mt-1 text-sm text-ink-2">Enviamos um link de acesso para o seu e-mail. Sem senha.</p>

      <div v-if="status === 'sent'" class="mt-5 rounded-lg bg-good-bg p-3 text-sm text-good" role="status">
        Link enviado para <strong>{{ email }}</strong>. Abra o e-mail neste mesmo navegador.
      </div>

      <form v-else class="mt-5 space-y-3" @submit.prevent="submit">
        <label class="block text-sm font-medium" for="email">E-mail</label>
        <input id="email" v-model="email" class="input" type="email" required autocomplete="email" placeholder="voce@exemplo.com" />
        <p v-if="error" class="text-sm text-bad" role="alert">{{ error }}</p>
        <button class="btn btn-primary w-full" :disabled="status === 'sending'">
          {{ status === 'sending' ? 'Enviando…' : 'Enviar link de acesso' }}
        </button>
      </form>
    </div>
  </div>
</template>
