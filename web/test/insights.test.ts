import { describe, expect, it } from 'vitest'
import { bestCurrent, dailyMin, isSuspiciousDiscount, median, productInsights } from '../src/lib/insights'
import type { Link, Product, Snapshot } from '../src/types'

const DAY = 86_400_000
const NOW = Date.parse('2026-11-20T12:00:00Z')

const link = (id: string, price: number | null, extra: Partial<Link> = {}): Link => ({
  id,
  product_id: 'p1',
  url: `https://loja-${id}.com.br/x`,
  store: id,
  last_price: price,
  last_in_stock: true,
  last_checked_at: null,
  last_status: 'ok',
  last_error: null,
  ...extra,
})

const snap = (link_id: string, daysAgo: number, price: number, in_stock = true): Snapshot => ({
  link_id,
  price,
  in_stock,
  captured_at: new Date(NOW - daysAgo * DAY).toISOString(),
})

describe('bestCurrent', () => {
  it('ignora links com erro, sem preço ou sem estoque', () => {
    const best = bestCurrent([
      link('a', 100, { last_status: 'error' }),
      link('b', 90, { last_in_stock: false }),
      link('c', null),
      link('d', 120),
      link('e', 110),
    ])
    expect(best?.link.id).toBe('e')
  })
})

describe('median', () => {
  it('calcula para listas pares e ímpares', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('dailyMin', () => {
  it('pega o menor preço do dia entre as lojas, ignorando sem estoque', () => {
    const pts = dailyMin([snap('a', 1, 100), snap('b', 1, 95), snap('b', 1, 80, false), snap('a', 0, 99)])
    expect(pts.map((p) => p.price)).toEqual([95, 99])
  })
})

describe('isSuspiciousDiscount', () => {
  const baseline = Array.from({ length: 20 }, (_, i) => snap('a', 10 + i, 500))

  it('detecta subida na semana anterior seguida de "queda" para o preço normal', () => {
    const history = [...baseline, snap('a', 5, 700), snap('a', 3, 700)]
    expect(isSuspiciousDiscount(499, history, NOW)).toBe(true)
  })

  it('não acusa quando a queda é real (bem abaixo do preço normal)', () => {
    const history = [...baseline, snap('a', 5, 700)]
    expect(isSuspiciousDiscount(400, history, NOW)).toBe(false)
  })

  it('não acusa sem subida recente', () => {
    expect(isSuspiciousDiscount(480, [...baseline, snap('a', 2, 500)], NOW)).toBe(false)
  })

  it('não acusa com pouco histórico', () => {
    expect(isSuspiciousDiscount(500, [snap('a', 20, 500), snap('a', 2, 700)], NOW)).toBe(false)
  })
})

describe('productInsights', () => {
  it('resume o produto', () => {
    const product: Product = {
      id: 'p1',
      name: 'X',
      target_price: 95,
      notes: null,
      created_at: '',
      links: [link('a', 90), link('b', 100)],
    }
    const snaps = [snap('a', 40, 80), snap('a', 10, 100), snap('b', 5, 100), snap('a', 0, 90), snap('zz', 0, 1)]
    const r = productInsights(product, snaps, NOW)
    expect(r.best?.price).toBe(90)
    expect(r.lowestEver).toBe(80)
    expect(r.median30d).toBe(100)
    expect(r.changeVsMedian).toBeCloseTo(-0.1)
    expect(r.targetHit).toBe(true)
  })
})
