// Camada de dados: Supabase quando configurado, senão modo demonstração em memória.
import { storeFromUrl } from '../../../shared/stores'
import type { Link, Product, ProductInput, Snapshot } from '../types'
import { demoApi } from './demo'
import { isDemo, supabase } from './supabase'

export interface Api {
  listProducts(): Promise<Product[]>
  listSnapshots(linkIds: string[]): Promise<Snapshot[]>
  createProduct(input: ProductInput): Promise<string>
  updateProduct(id: string, input: ProductInput): Promise<void>
  deleteProduct(id: string): Promise<void>
}

const PAGE = 1000

const supabaseApi: Api = {
  async listProducts() {
    const { data, error } = await supabase!
      .from('products')
      .select('id, name, target_price, notes, created_at, links:product_links(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as Product[]).map(normalizeProduct)
  },

  async listSnapshots(linkIds) {
    if (!linkIds.length) return []
    // O Supabase devolve no máximo 1000 linhas por consulta; paginamos.
    const all: Snapshot[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase!
        .from('price_snapshots')
        .select('link_id, price, in_stock, captured_at')
        .in('link_id', linkIds)
        .order('captured_at')
        .order('id')
        .range(from, from + PAGE - 1)
      if (error) throw error
      all.push(...(data as Snapshot[]).map((s) => ({ ...s, price: Number(s.price) })))
      if (data.length < PAGE) return all
    }
  },

  async createProduct(input) {
    const { data, error } = await supabase!
      .from('products')
      .insert({ name: input.name, target_price: input.target_price, notes: input.notes })
      .select('id')
      .single()
    if (error) throw error
    await insertLinks(data.id, input.urls)
    return data.id as string
  },

  async updateProduct(id, input) {
    const { error } = await supabase!
      .from('products')
      .update({ name: input.name, target_price: input.target_price, notes: input.notes })
      .eq('id', id)
    if (error) throw error

    // Mantém os links que continuam (e seu histórico); apaga os removidos; cria os novos.
    const { data: existing, error: listError } = await supabase!
      .from('product_links')
      .select('id, url')
      .eq('product_id', id)
    if (listError) throw listError
    const removed = existing.filter((l) => !input.urls.includes(l.url)).map((l) => l.id)
    if (removed.length) {
      const { error: delError } = await supabase!.from('product_links').delete().in('id', removed)
      if (delError) throw delError
    }
    const kept = new Set(existing.map((l) => l.url))
    await insertLinks(id, input.urls.filter((u) => !kept.has(u)))
  },

  async deleteProduct(id) {
    const { error } = await supabase!.from('products').delete().eq('id', id)
    if (error) throw error
  },
}

async function insertLinks(productId: string, urls: string[]) {
  if (!urls.length) return
  const { error } = await supabase!
    .from('product_links')
    .insert(urls.map((url) => ({ product_id: productId, url, store: storeFromUrl(url) })))
  if (error) throw error
}

// O Postgres devolve numeric como string.
function normalizeProduct(p: Product): Product {
  return {
    ...p,
    target_price: p.target_price == null ? null : Number(p.target_price),
    links: p.links.map((l: Link) => ({ ...l, last_price: l.last_price == null ? null : Number(l.last_price) })),
  }
}

export const api: Api = isDemo ? demoApi : supabaseApi
