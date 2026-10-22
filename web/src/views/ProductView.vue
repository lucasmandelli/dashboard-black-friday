<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PriceChart from '../components/PriceChart.vue'
import { money, percent, when } from '../lib/format'
import { useProducts } from '../stores/products'

const props = defineProps<{ id: string }>()
const store = useProducts()
const router = useRouter()
const showTable = ref(false)

onMounted(() => store.ensureLoaded())

const product = computed(() => store.byId(props.id))
const insights = computed(() => store.insights.get(props.id))
const snapshots = computed(() => {
  const ids = new Set(product.value?.links.map((l) => l.id))
  return store.snapshots.filter((s) => ids.has(s.link_id))
})
const recentRows = computed(() => {
  const storeOf = new Map(product.value?.links.map((l) => [l.id, l.store]))
  return [...snapshots.value].reverse().slice(0, 200).map((s) => ({ ...s, store: storeOf.get(s.link_id) }))
})

async function remove() {
  if (!product.value || !confirm(`Apagar "${product.value.name}" e todo o histórico?`)) return
  await store.remove(props.id)
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div v-if="store.loading && !product" class="text-sm text-muted">Carregando…</div>
  <div v-else-if="!product" class="card p-8 text-center">
    <p>Produto não encontrado.</p>
    <RouterLink to="/" class="btn btn-ghost mt-4">Voltar</RouterLink>
  </div>

  <div v-else class="space-y-5">
    <div>
      <RouterLink to="/" class="text-sm text-ink-2 hover:text-ink">← Meus produtos</RouterLink>
      <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 class="text-2xl font-semibold">{{ product.name }}</h1>
        <div class="flex gap-2">
          <RouterLink :to="{ name: 'product-edit', params: { id: product.id } }" class="btn btn-ghost">Editar</RouterLink>
          <button class="btn btn-danger" @click="remove">Apagar</button>
        </div>
      </div>
      <p v-if="product.notes" class="mt-1 text-sm text-ink-2">{{ product.notes }}</p>
    </div>

    <div v-if="insights" class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="card p-4">
        <div class="text-xs text-muted">Melhor preço agora</div>
        <div class="mt-1 text-xl font-semibold">{{ money(insights.best?.price) }}</div>
        <div class="text-xs text-ink-2">{{ insights.best?.link.store ?? '—' }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-muted">Mediana 30 dias</div>
        <div class="mt-1 text-xl font-semibold">{{ money(insights.median30d) }}</div>
        <div class="text-xs" :class="(insights.changeVsMedian ?? 0) < 0 ? 'text-good' : 'text-ink-2'">
          {{ percent(insights.changeVsMedian) }} agora
        </div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-muted">Menor já visto</div>
        <div class="mt-1 text-xl font-semibold">{{ money(insights.lowestEver) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-muted">Preço-alvo</div>
        <div class="mt-1 text-xl font-semibold">{{ money(product.target_price) }}</div>
        <div v-if="insights.targetHit" class="text-xs text-good">✓ atingido</div>
      </div>
    </div>

    <div v-if="insights?.suspiciousDiscount" class="card border-warn-ink/30 bg-warn-bg p-4 text-sm text-warn-ink" role="note">
      ⚠ <strong>Desconto suspeito na {{ insights.best?.link.store }}:</strong> o preço subiu mais de 15% na última semana
      e depois "caiu" para perto do valor normal. A "promoção" pode ser a famosa metade do dobro.
    </div>

    <section class="card p-4">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="font-medium">Histórico de preços</h2>
        <button class="text-sm text-accent hover:underline" @click="showTable = !showTable">
          {{ showTable ? 'Ver gráfico' : 'Ver tabela' }}
        </button>
      </div>
      <div v-if="!snapshots.length" class="grid h-40 place-items-center text-sm text-muted">
        Nenhum preço coletado ainda. O primeiro aparece na próxima coleta (a cada 6 horas).
      </div>
      <PriceChart v-else-if="!showTable" :links="product.links" :snapshots="snapshots" :target="product.target_price" />
      <div v-else class="max-h-80 overflow-auto">
        <table class="tabular w-full text-sm">
          <thead class="sticky top-0 bg-surface text-left text-xs text-muted">
            <tr><th class="py-1.5 font-medium">Quando</th><th class="font-medium">Loja</th><th class="text-right font-medium">Preço</th></tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in recentRows" :key="i" class="border-t border-line">
              <td class="py-1.5 text-ink-2">{{ when(r.captured_at) }}</td>
              <td>{{ r.store }}</td>
              <td class="text-right">{{ money(r.price) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card overflow-hidden">
      <h2 class="border-b border-line px-4 py-3 font-medium">Lojas</h2>
      <ul>
        <li v-for="(link, i) in product.links" :key="link.id" class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 last:border-0">
          <span class="size-2.5 shrink-0 rounded-full" :style="{ background: `var(--series-${(i % 8) + 1})` }" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <a :href="link.url" target="_blank" rel="noopener noreferrer" class="font-medium hover:underline">{{ link.store }} ↗</a>
            <div class="truncate text-xs text-muted">{{ link.url }}</div>
          </div>
          <div class="tabular text-right">
            <div class="font-medium">
              {{ link.last_in_stock === false ? 'Sem estoque' : money(link.last_price) }}
            </div>
            <div class="text-xs text-muted">checado {{ when(link.last_checked_at) }}</div>
          </div>
          <div class="w-full sm:w-auto">
            <span v-if="link.last_status === 'ok'" class="badge bg-good-bg text-good">✓ ok</span>
            <span v-else-if="link.last_status === 'error'" class="badge bg-bad-bg text-bad" :title="link.last_error ?? ''">✕ {{ link.last_error }}</span>
            <span v-else class="badge bg-ink/5 text-ink-2">aguardando coleta</span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
