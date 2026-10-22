// Dados fictícios para o modo demonstração (sem Supabase configurado).
import { storeFromUrl } from '../../../shared/stores'
import type { Link, Product, Snapshot } from '../types'
import type { Api } from './api'

const DAY = 86_400_000
const DAYS = 45

interface Seed {
  name: string
  target: number | null
  links: Array<{ url: string; base: number; shape: (day: number) => number; error?: string }>
}

// day vai de 0 (45 dias atrás) a DAYS (hoje).
const SEEDS: Seed[] = [
  {
    name: 'Monitor Gamer 27" 165Hz',
    target: 1100,
    links: [
      { url: 'https://www.kabum.com.br/produto/123456', base: 1299, shape: (d) => (d > 40 ? -170 : wave(d, 30)) },
      { url: 'https://www.amazon.com.br/dp/B0EXEMPLO1', base: 1349, shape: (d) => wave(d + 5, 40) },
      { url: 'https://www.pichau.com.br/monitor-gamer-27', base: 1279, shape: (d) => (d > 30 ? 40 : 0) },
    ],
  },
  {
    name: 'Air Fryer 5L',
    target: 400,
    links: [
      // "Metade do dobro": sobe na semana anterior e "cai" para o preço de antes.
      { url: 'https://www.magazineluiza.com.br/air-fryer-5l/p/abc123', base: 449, shape: (d) => (d >= 38 && d < 44 ? 220 : 0) },
      { url: 'https://www.casasbahia.com.br/air-fryer-5l/p/55555', base: 469, shape: (d) => wave(d, 15) },
    ],
  },
  {
    name: 'Kindle 16 GB',
    target: 600,
    links: [
      { url: 'https://www.amazon.com.br/dp/B0EXEMPLO2', base: 699, shape: (d) => (d > 42 ? -120 : 0) },
      { url: 'https://produto.mercadolivre.com.br/MLB-3456789012-kindle', base: 719, shape: (d) => wave(d, 20) },
    ],
  },
  {
    name: 'Fone Bluetooth com cancelamento de ruído',
    target: null,
    links: [
      { url: 'https://www.fastshop.com.br/web/p/d/FONE123', base: 1899, shape: (d) => wave(d, 60), error: 'HTTP 403' },
    ],
  },
]

function wave(day: number, amplitude: number): number {
  return Math.round(Math.sin(day / 4) * amplitude)
}

let products: Product[] = []
let snapshots: Snapshot[] = []
let seq = 0
const id = () => `demo-${++seq}`

function seed() {
  const now = Date.now()
  products = SEEDS.map((s, i) => {
    const productId = id()
    const links: Link[] = s.links.map((l) => {
      const linkId = id()
      let last: Snapshot | null = null
      for (let d = 0; d <= DAYS; d++) {
        for (const h of [0, 6, 12, 18]) {
          const t = now - (DAYS - d) * DAY + h * 3_600_000
          if (t > now) continue
          last = { link_id: linkId, price: l.base + l.shape(d), in_stock: true, captured_at: new Date(t).toISOString() }
          snapshots.push(last)
        }
      }
      return {
        id: linkId,
        product_id: productId,
        url: l.url,
        store: storeFromUrl(l.url),
        last_price: last?.price ?? null,
        last_in_stock: true,
        last_checked_at: new Date(now - 2 * 3_600_000).toISOString(),
        last_status: l.error ? 'error' : 'ok',
        last_error: l.error ?? null,
      }
    })
    return {
      id: productId,
      name: s.name,
      target_price: s.target,
      notes: null,
      created_at: new Date(now - (DAYS + i) * DAY).toISOString(),
      links,
    }
  })
}
seed()

const clone = <T>(v: T): T => structuredClone(v)

export const demoApi: Api = {
  async listProducts() {
    return clone(products)
  },
  async listSnapshots(linkIds) {
    return clone(snapshots.filter((s) => linkIds.includes(s.link_id)))
  },
  async createProduct(input) {
    const productId = id()
    products.unshift({
      id: productId,
      name: input.name,
      target_price: input.target_price,
      notes: input.notes,
      created_at: new Date().toISOString(),
      links: input.urls.map((url) => newLink(productId, url)),
    })
    return productId
  },
  async updateProduct(productId, input) {
    const p = products.find((x) => x.id === productId)
    if (!p) throw new Error('Produto não encontrado')
    Object.assign(p, { name: input.name, target_price: input.target_price, notes: input.notes })
    p.links = input.urls.map((url) => p.links.find((l) => l.url === url) ?? newLink(productId, url))
  },
  async deleteProduct(productId) {
    products = products.filter((p) => p.id !== productId)
  },
}

function newLink(productId: string, url: string): Link {
  return {
    id: id(),
    product_id: productId,
    url,
    store: storeFromUrl(url),
    last_price: null,
    last_in_stock: null,
    last_checked_at: null,
    last_status: null,
    last_error: null,
  }
}
