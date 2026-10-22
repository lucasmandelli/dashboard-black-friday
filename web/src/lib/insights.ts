// Cálculos do dashboard a partir dos links e do histórico de preços.
import type { Link, Product, Snapshot } from '../types'

const DAY = 86_400_000

export interface DailyPoint {
  day: number // timestamp do início do dia (UTC)
  price: number
}

export interface ProductInsights {
  best: { price: number; link: Link } | null
  lowestEver: number | null
  median30d: number | null
  /** (melhor preço − mediana 30d) / mediana 30d */
  changeVsMedian: number | null
  targetHit: boolean
  /** Menor preço por dia, entre todas as lojas: base do sparkline. */
  daily: DailyPoint[]
  suspiciousDiscount: boolean
}

export function bestCurrent(links: Link[]): { price: number; link: Link } | null {
  let best: { price: number; link: Link } | null = null
  for (const link of links) {
    if (link.last_status !== 'ok' || link.last_price == null || link.last_in_stock === false) continue
    if (!best || link.last_price < best.price) best = { price: link.last_price, link }
  }
  return best
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function dailyMin(snapshots: Snapshot[]): DailyPoint[] {
  const byDay = new Map<number, number>()
  for (const s of snapshots) {
    if (!s.in_stock) continue
    const day = Math.floor(Date.parse(s.captured_at) / DAY) * DAY
    const cur = byDay.get(day)
    if (cur === undefined || s.price < cur) byDay.set(day, s.price)
  }
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([day, price]) => ({ day, price }))
}

/**
 * "Metade do dobro": a loja sobe o preço nos 7 dias anteriores e depois "baixa"
 * de volta para perto do preço normal (mediana de 8 a 37 dias atrás).
 */
export function isSuspiciousDiscount(current: number, linkSnapshots: Snapshot[], now = Date.now()): boolean {
  const recent: number[] = []
  const baseline: number[] = []
  for (const s of linkSnapshots) {
    const age = now - Date.parse(s.captured_at)
    if (age <= 7 * DAY) recent.push(s.price)
    else if (age <= 37 * DAY) baseline.push(s.price)
  }
  const base = median(baseline)
  if (base == null || baseline.length < 4 || !recent.length) return false
  const peak = Math.max(...recent)
  return peak > base * 1.15 && current < peak && current >= base * 0.97
}

export function productInsights(product: Product, snapshots: Snapshot[], now = Date.now()): ProductInsights {
  const linkIds = new Set(product.links.map((l) => l.id))
  const mine = snapshots.filter((s) => linkIds.has(s.link_id))
  const best = bestCurrent(product.links)

  const recentPrices = mine.filter((s) => now - Date.parse(s.captured_at) <= 30 * DAY).map((s) => s.price)
  const median30d = median(recentPrices)
  const lowestEver = mine.length ? Math.min(...mine.map((s) => s.price)) : null

  return {
    best,
    lowestEver,
    median30d,
    changeVsMedian: best && median30d ? (best.price - median30d) / median30d : null,
    targetHit: !!best && product.target_price != null && best.price <= product.target_price,
    daily: dailyMin(mine),
    suspiciousDiscount: best
      ? isSuspiciousDiscount(best.price, mine.filter((s) => s.link_id === best.link.id), now)
      : false,
  }
}
