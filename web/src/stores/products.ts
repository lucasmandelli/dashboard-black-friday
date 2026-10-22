import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../lib/api'
import { productInsights, type ProductInsights } from '../lib/insights'
import type { Product, ProductInput, Snapshot } from '../types'

export const useProducts = defineStore('products', () => {
  const products = ref<Product[]>([])
  const snapshots = ref<Snapshot[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  const insights = computed(() => {
    const map = new Map<string, ProductInsights>()
    for (const p of products.value) map.set(p.id, productInsights(p, snapshots.value))
    return map
  })

  async function load() {
    loading.value = true
    error.value = null
    try {
      products.value = await api.listProducts()
      snapshots.value = await api.listSnapshots(products.value.flatMap((p) => p.links.map((l) => l.id)))
      loaded.value = true
    } catch (err) {
      error.value = (err as Error).message
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!loaded.value) await load()
  }

  const byId = (id: string) => products.value.find((p) => p.id === id)

  async function create(input: ProductInput) {
    const id = await api.createProduct(input)
    await load()
    return id
  }

  async function update(id: string, input: ProductInput) {
    await api.updateProduct(id, input)
    await load()
  }

  async function remove(id: string) {
    await api.deleteProduct(id)
    await load()
  }

  function reset() {
    products.value = []
    snapshots.value = []
    loaded.value = false
  }

  return { products, snapshots, loading, error, insights, load, ensureLoaded, byId, create, update, remove, reset }
})
