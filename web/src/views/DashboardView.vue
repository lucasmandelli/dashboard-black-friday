<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ProductCard from '../components/ProductCard.vue'
import { useProducts } from '../stores/products'

const store = useProducts()
const sort = ref<'recent' | 'target' | 'drop'>('recent')

onMounted(() => store.ensureLoaded())

const sorted = computed(() => {
  const list = [...store.products]
  const ins = (id: string) => store.insights.get(id)!
  if (sort.value === 'target') {
    // Produtos que bateram o alvo primeiro; depois os mais próximos do alvo.
    const gap = (id: string, target: number | null) => {
      const best = ins(id).best?.price
      return best != null && target ? best / target : Infinity
    }
    list.sort((a, b) => gap(a.id, a.target_price) - gap(b.id, b.target_price))
  } else if (sort.value === 'drop') {
    list.sort((a, b) => (ins(a.id).changeVsMedian ?? Infinity) - (ins(b.id).changeVsMedian ?? Infinity))
  }
  return list
})

const hits = computed(() => store.products.filter((p) => store.insights.get(p.id)?.targetHit).length)
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Meus produtos</h1>
        <p class="text-sm text-ink-2">
          {{ store.products.length }} acompanhados
          <template v-if="hits"> · <span class="text-good">{{ hits }} abaixo do alvo</span></template>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <label class="sr-only" for="sort">Ordenar</label>
        <select id="sort" v-model="sort" class="input w-auto">
          <option value="recent">Mais recentes</option>
          <option value="target">Mais perto do alvo</option>
          <option value="drop">Maior queda vs. mediana</option>
        </select>
        <RouterLink :to="{ name: 'product-new' }" class="btn btn-primary">+ Adicionar produto</RouterLink>
      </div>
    </div>

    <p v-if="store.error" class="card border-bad/40 bg-bad-bg p-4 text-sm text-bad" role="alert">
      Erro ao carregar: {{ store.error }}
    </p>

    <div v-if="store.loading && !store.products.length" class="text-sm text-muted">Carregando…</div>

    <div v-else-if="!store.products.length && !store.error" class="card p-10 text-center">
      <p class="font-medium">Nenhum produto ainda</p>
      <p class="mt-1 text-sm text-ink-2">Cadastre um produto com os links das lojas onde quer acompanhar o preço.</p>
      <RouterLink :to="{ name: 'product-new' }" class="btn btn-primary mt-4">+ Adicionar produto</RouterLink>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in sorted" :key="p.id" :product="p" :insights="store.insights.get(p.id)!" />
    </div>
  </div>
</template>
