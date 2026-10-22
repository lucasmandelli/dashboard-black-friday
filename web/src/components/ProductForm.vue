<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeFromUrl } from '../../../shared/stores'
import type { ProductInput } from '../types'

const props = defineProps<{ initial?: ProductInput; submitLabel: string }>()
const emit = defineEmits<{ submit: [input: ProductInput]; cancel: [] }>()

const name = ref(props.initial?.name ?? '')
const target = ref(props.initial?.target_price != null ? String(props.initial.target_price).replace('.', ',') : '')
const notes = ref(props.initial?.notes ?? '')
const urls = ref<string[]>(props.initial?.urls.length ? [...props.initial.urls] : [''])
const error = ref<string | null>(null)

const isUrl = (u: string) => /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(u.trim())
const cleanUrls = computed(() => [...new Set(urls.value.map((u) => u.trim()).filter(Boolean))])

function addUrl() {
  urls.value.push('')
}
function removeUrl(i: number) {
  urls.value.splice(i, 1)
  if (!urls.value.length) urls.value.push('')
}

function submit() {
  error.value = null
  const list = cleanUrls.value
  if (!name.value.trim()) return (error.value = 'Dê um nome ao produto.')
  if (!list.length) return (error.value = 'Adicione pelo menos um link de loja.')
  const bad = list.find((u) => !isUrl(u))
  if (bad) return (error.value = `Link inválido: ${bad}`)

  let targetPrice: number | null = null
  if (target.value.trim()) {
    targetPrice = Number(target.value.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) return (error.value = 'Preço-alvo inválido.')
  }

  emit('submit', { name: name.value.trim(), target_price: targetPrice, notes: notes.value.trim() || null, urls: list })
}

defineExpose({ setError: (msg: string) => (error.value = msg) })
</script>

<template>
  <form class="card space-y-5 p-5" @submit.prevent="submit">
    <div class="space-y-1.5">
      <label for="name" class="block text-sm font-medium">Nome do produto</label>
      <input id="name" v-model="name" class="input" maxlength="200" placeholder='Ex.: Monitor 27" 165Hz' required />
    </div>

    <div class="grid gap-5 sm:grid-cols-2">
      <div class="space-y-1.5">
        <label for="target" class="block text-sm font-medium">Preço-alvo <span class="font-normal text-muted">(opcional)</span></label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-sm text-muted">R$</span>
          <input id="target" v-model="target" class="input pl-9" inputmode="decimal" placeholder="1.099,90" />
        </div>
        <p class="text-xs text-muted">Avisamos no card quando o menor preço ficar abaixo disso.</p>
      </div>
      <div class="space-y-1.5">
        <label for="notes" class="block text-sm font-medium">Observações <span class="font-normal text-muted">(opcional)</span></label>
        <input id="notes" v-model="notes" class="input" placeholder="Cor preta, versão 256 GB…" />
      </div>
    </div>

    <fieldset class="space-y-2">
      <legend class="text-sm font-medium">Links das lojas</legend>
      <p class="text-xs text-muted">Cole a página do produto em cada loja que quer acompanhar.</p>
      <div v-for="(_, i) in urls" :key="i" class="flex items-center gap-2">
        <span class="hidden w-28 shrink-0 truncate text-xs text-ink-2 sm:block">
          {{ isUrl(urls[i]) ? storeFromUrl(urls[i].trim()) : '' }}
        </span>
        <input v-model="urls[i]" class="input" type="url" :aria-label="`Link ${i + 1}`" placeholder="https://www.loja.com.br/produto/…" />
        <button type="button" class="btn btn-ghost px-2.5" :aria-label="`Remover link ${i + 1}`" @click="removeUrl(i)">✕</button>
      </div>
      <button type="button" class="btn btn-ghost" @click="addUrl">+ Outro link</button>
    </fieldset>

    <p v-if="error" class="text-sm text-bad" role="alert">{{ error }}</p>

    <div class="flex justify-end gap-2 border-t border-line pt-4">
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">Cancelar</button>
      <button class="btn btn-primary">{{ submitLabel }}</button>
    </div>
  </form>
</template>
