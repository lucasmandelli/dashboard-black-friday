<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProductForm from '../components/ProductForm.vue'
import { useProducts } from '../stores/products'
import type { ProductInput } from '../types'

const props = defineProps<{ id?: string }>()
const store = useProducts()
const router = useRouter()
const form = ref<InstanceType<typeof ProductForm> | null>(null)
const saving = ref(false)

onMounted(() => store.ensureLoaded())

const existing = computed(() => (props.id ? store.byId(props.id) : undefined))
const initial = computed<ProductInput | undefined>(() =>
  existing.value
    ? {
        name: existing.value.name,
        target_price: existing.value.target_price,
        notes: existing.value.notes,
        urls: existing.value.links.map((l) => l.url),
      }
    : undefined,
)

async function save(input: ProductInput) {
  saving.value = true
  try {
    const id = props.id ? (await store.update(props.id, input), props.id) : await store.create(input)
    router.push({ name: 'product', params: { id } })
  } catch (err) {
    form.value?.setError((err as Error).message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-4">
    <RouterLink to="/" class="text-sm text-ink-2 hover:text-ink">← Meus produtos</RouterLink>
    <h1 class="text-2xl font-semibold">{{ id ? 'Editar produto' : 'Novo produto' }}</h1>

    <div v-if="id && !existing" class="text-sm text-muted">{{ store.loading ? 'Carregando…' : 'Produto não encontrado.' }}</div>
    <ProductForm
      v-else
      ref="form"
      :key="existing?.id ?? 'new'"
      :initial="initial"
      :submit-label="saving ? 'Salvando…' : id ? 'Salvar' : 'Adicionar'"
      @submit="save"
      @cancel="router.back()"
    />
  </div>
</template>
