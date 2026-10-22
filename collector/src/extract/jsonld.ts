import type { CheerioAPI } from 'cheerio'
import { parsePrice } from '../price.js'
import type { Extraction } from './types.js'

type Json = Record<string, unknown>

// Lê dados estruturados schema.org (Product → offers) dos <script type="application/ld+json">.
export function extractJsonLd($: CheerioAPI): Extraction | null {
  const nodes: Json[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim()
    if (!raw) return
    try {
      collect(JSON.parse(raw), nodes)
    } catch {
      // Algumas lojas publicam JSON-LD inválido; ignoramos o bloco.
    }
  })

  for (const product of nodes.filter((n) => hasType(n, 'Product'))) {
    const offer = bestOffer(product.offers)
    if (offer) return { ...offer, source: 'json-ld' }
  }
  return null
}

function collect(value: unknown, out: Json[]): void {
  if (Array.isArray(value)) {
    value.forEach((v) => collect(v, out))
  } else if (value && typeof value === 'object') {
    const obj = value as Json
    out.push(obj)
    if (obj['@graph']) collect(obj['@graph'], out)
  }
}

function hasType(node: Json, type: string): boolean {
  const t = node['@type']
  return Array.isArray(t) ? t.includes(type) : t === type
}

function bestOffer(offers: unknown): { price: number; inStock: boolean } | null {
  const list = (Array.isArray(offers) ? offers : [offers]).filter(
    (o): o is Json => !!o && typeof o === 'object',
  )

  const candidates: Array<{ price: number; inStock: boolean }> = []
  for (const offer of list) {
    if (hasType(offer, 'AggregateOffer')) {
      const price = parsePrice(offer.lowPrice) ?? parsePrice(offer.price)
      if (price) candidates.push({ price, inStock: inStock(offer.availability) })
      if (offer.offers) {
        const nested = bestOffer(offer.offers)
        if (nested) candidates.push(nested)
      }
      continue
    }
    const spec = offer.priceSpecification as Json | Json[] | undefined
    const specPrice = Array.isArray(spec) ? spec[0]?.price : spec?.price
    const price = parsePrice(offer.price) ?? parsePrice(specPrice)
    if (price) candidates.push({ price, inStock: inStock(offer.availability) })
  }

  if (!candidates.length) return null
  const available = candidates.filter((c) => c.inStock)
  const pool = available.length ? available : candidates
  return pool.reduce((a, b) => (b.price < a.price ? b : a))
}

function inStock(availability: unknown): boolean {
  if (typeof availability !== 'string') return true
  return !/OutOfStock|SoldOut|Discontinued/i.test(availability)
}
