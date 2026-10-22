<script setup lang="ts">
import { computed } from 'vue'
import { money, percent } from '../lib/format'
import type { ProductInsights } from '../lib/insights'
import type { Product } from '../types'
import Sparkline from './Sparkline.vue'

const props = defineProps<{ product: Product; insights: ProductInsights }>()

const failing = computed(() => props.product.links.filter((l) => l.last_status === 'error').length)
const pending = computed(() => props.product.links.every((l) => l.last_status == null))
</script>

<template>
  <RouterLink :to="{ name: 'product', params: { id: product.id } }" class="card flex flex-col gap-3 p-4 transition hover:border-accent/60">
    <div class="flex items-start justify-between gap-2">
      <h2 class="line-clamp-2 font-medium leading-snug">{{ product.name }}</h2>
      <span class="shrink-0 text-xs text-muted">{{ product.links.length }} {{ product.links.length === 1 ? 'loja' : 'lojas' }}</span>
    </div>

    <div>
      <div class="text-2xl font-semibold">{{ pending ? 'Aguardando coleta' : insights.best ? money(insights.best.price) : 'Sem preço agora' }}</div>
      <div v-if="insights.best" class="text-sm text-ink-2">na {{ insights.best.link.store }}</div>
    </div>

    <div class="flex flex-wrap gap-1.5">
      <span v-if="insights.targetHit" class="badge bg-good-bg text-good">✓ Abaixo do alvo ({{ money(product.target_price) }})</span>
      <span v-if="insights.suspiciousDiscount" class="badge bg-warn-bg text-warn-ink" title="O preço subiu na última semana antes de 'cair'. Compare com a mediana.">
        ⚠ Desconto suspeito
      </span>
      <span v-if="failing" class="badge bg-bad-bg text-bad">✕ {{ failing }} {{ failing === 1 ? 'link com erro' : 'links com erro' }}</span>
    </div>

    <Sparkline :points="insights.daily" :target="product.target_price" />

    <dl class="tabular grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs">
      <div>
        <dt class="text-muted">vs. mediana 30d</dt>
        <dd class="mt-0.5 font-medium" :class="insights.changeVsMedian != null && insights.changeVsMedian < 0 ? 'text-good' : 'text-ink'">
          {{ percent(insights.changeVsMedian) }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">Menor já visto</dt>
        <dd class="mt-0.5 font-medium">{{ money(insights.lowestEver) }}</dd>
      </div>
      <div>
        <dt class="text-muted">Alvo</dt>
        <dd class="mt-0.5 font-medium">{{ money(product.target_price) }}</dd>
      </div>
    </dl>
  </RouterLink>
</template>
